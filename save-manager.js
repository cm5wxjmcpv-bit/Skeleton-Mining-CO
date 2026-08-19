// Three-slot local save router for Skeleton Mining Co.
// Existing game code can keep using "skeletonMiningSave"; this layer transparently
// redirects that key to the currently selected slot.
(function(){
  'use strict';

  const LEGACY_KEY = 'skeletonMiningSave';
  const INDEX_KEY = 'skeletonMiningSaveIndex';
  const SLOT_PREFIX = 'skeletonMiningSave:slot:';
  const SLOT_COUNT = 3;
  const nativeGet = Storage.prototype.getItem;
  const nativeSet = Storage.prototype.setItem;
  const nativeRemove = Storage.prototype.removeItem;

  const rawGet = key => nativeGet.call(localStorage, key);
  const rawSet = (key, value) => nativeSet.call(localStorage, key, value);
  const rawRemove = key => nativeRemove.call(localStorage, key);
  const slotKey = slot => `${SLOT_PREFIX}${slot}`;

  function safeParse(text){
    try { return text ? JSON.parse(text) : null; } catch { return null; }
  }

  function loadIndex(){
    const parsed = safeParse(rawGet(INDEX_KEY));
    return parsed && typeof parsed === 'object'
      ? { activeSlot: parsed.activeSlot ?? null, lastPlayedSlot: parsed.lastPlayedSlot ?? null }
      : { activeSlot: null, lastPlayedSlot: null };
  }

  function saveIndex(){ rawSet(INDEX_KEY, JSON.stringify(index)); }
  function slotExists(slot){ return rawGet(slotKey(slot)) !== null; }
  function existingSlotNumbers(){
    const out=[];
    for(let slot=1; slot<=SLOT_COUNT; slot++) if(slotExists(slot)) out.push(slot);
    return out;
  }

  let index = loadIndex();

  // One-time migration: preserve the original single save as Slot 1.
  const legacy = rawGet(LEGACY_KEY);
  if(!existingSlotNumbers().length && legacy){
    const migrated = safeParse(legacy) || {};
    migrated._slotMeta = {
      ...(migrated._slotMeta || {}),
      createdAt: migrated._slotMeta?.createdAt || Date.now(),
      lastPlayed: Date.now(),
      migratedFromLegacy: true
    };
    rawSet(slotKey(1), JSON.stringify(migrated));
    index.activeSlot = 1;
    index.lastPlayedSlot = 1;
    saveIndex();
  }

  const existing = existingSlotNumbers();
  if(index.activeSlot && !slotExists(index.activeSlot)) index.activeSlot = null;
  if(index.lastPlayedSlot && !slotExists(index.lastPlayedSlot)) index.lastPlayedSlot = null;
  if(!index.activeSlot && existing.length) index.activeSlot = index.lastPlayedSlot || existing[0];
  if(!index.lastPlayedSlot && existing.length) index.lastPlayedSlot = index.activeSlot || existing[0];
  saveIndex();

  let writesEnabled = !!index.activeSlot && slotExists(index.activeSlot);

  function decorateSave(value){
    const parsed=safeParse(value);
    if(!parsed) return value;
    const now=Date.now();
    parsed._slotMeta={
      ...(parsed._slotMeta||{}),
      createdAt:parsed._slotMeta?.createdAt||now,
      lastPlayed:now
    };
    return JSON.stringify(parsed);
  }

  Storage.prototype.getItem = function(key){
    if(this === localStorage && key === LEGACY_KEY){
      if(!index.activeSlot) return null;
      return nativeGet.call(this, slotKey(index.activeSlot));
    }
    return nativeGet.call(this, key);
  };

  Storage.prototype.setItem = function(key, value){
    if(this === localStorage && key === LEGACY_KEY){
      if(!index.activeSlot || !writesEnabled) return;
      nativeSet.call(this, slotKey(index.activeSlot), decorateSave(String(value)));
      index.lastPlayedSlot = index.activeSlot;
      saveIndex();
      return;
    }
    return nativeSet.call(this, key, value);
  };

  Storage.prototype.removeItem = function(key){
    if(this === localStorage && key === LEGACY_KEY){
      if(index.activeSlot) rawRemove(slotKey(index.activeSlot));
      const left=existingSlotNumbers();
      index.activeSlot=left[0]||null;
      index.lastPlayedSlot=left.includes(index.lastPlayedSlot)?index.lastPlayedSlot:(left[0]||null);
      writesEnabled=!!index.activeSlot;
      saveIndex();
      return;
    }
    return nativeRemove.call(this, key);
  };

  function slotSummary(slot){
    const data=safeParse(rawGet(slotKey(slot)));
    if(!data) return {slot, empty:true};
    return {
      slot,
      empty:false,
      level:Number(data.level||1),
      currency:Number(data.currency??data.gold??0),
      wins:Number(data.stats?.wins||0),
      runs:Number(data.stats?.runs||0),
      lastPlayed:Number(data._slotMeta?.lastPlayed||0),
      data
    };
  }

  window.SkeletonSaveManager = {
    slotCount:SLOT_COUNT,
    getActiveSlot(){ return index.activeSlot; },
    getContinueSlot(){
      if(index.lastPlayedSlot && slotExists(index.lastPlayedSlot)) return index.lastPlayedSlot;
      return existingSlotNumbers()[0]||null;
    },
    hasAnySave(){ return existingSlotNumbers().length>0; },
    getSlots(){ return Array.from({length:SLOT_COUNT},(_,i)=>slotSummary(i+1)); },
    selectSlot(slot){
      slot=Number(slot);
      if(slot<1||slot>SLOT_COUNT||!slotExists(slot)) return false;
      index.activeSlot=slot;
      index.lastPlayedSlot=slot;
      writesEnabled=true;
      saveIndex();
      return true;
    },
    createSlot(slot, initialData){
      slot=Number(slot);
      if(slot<1||slot>SLOT_COUNT||slotExists(slot)) return false;
      const now=Date.now();
      const data={...(initialData||{}),_slotMeta:{...(initialData?._slotMeta||{}),createdAt:now,lastPlayed:now}};
      rawSet(slotKey(slot),JSON.stringify(data));
      index.activeSlot=slot;
      index.lastPlayedSlot=slot;
      writesEnabled=true;
      saveIndex();
      return true;
    },
    deleteSlot(slot){
      slot=Number(slot);
      if(slot<1||slot>SLOT_COUNT) return false;
      rawRemove(slotKey(slot));
      const left=existingSlotNumbers();
      if(index.activeSlot===slot) index.activeSlot=left[0]||null;
      if(index.lastPlayedSlot===slot) index.lastPlayedSlot=left[0]||null;
      writesEnabled=!!index.activeSlot && slotExists(index.activeSlot);
      saveIndex();
      return true;
    },
    touchActive(){
      if(!index.activeSlot||!slotExists(index.activeSlot)) return;
      const data=safeParse(rawGet(slotKey(index.activeSlot)))||{};
      data._slotMeta={...(data._slotMeta||{}),lastPlayed:Date.now()};
      rawSet(slotKey(index.activeSlot),JSON.stringify(data));
      index.lastPlayedSlot=index.activeSlot;
      saveIndex();
    }
  };
})();
