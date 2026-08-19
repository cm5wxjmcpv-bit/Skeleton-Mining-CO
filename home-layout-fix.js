// Skeleton Mining Co. Home Screen hero loader v9.
// Prefer real image assets; keep embedded chunks only as the final emergency fallback.
(function(){
  'use strict';

  const HERO_VERSION = '9';
  const PRIMARY_HERO_SOURCES = [
    'assets/home-hero-v2.webp?v=9',
    'assets/home-hero.webp?v=9',
    'assets/home-hero-v5.jpg?v=9',
    'assets/home-hero-v4.jpg?v=9'
  ];

  function getHero(){
    return document.querySelector('#homeScreen .home-hero');
  }

  function getHeroImage(hero){
    let img = hero.querySelector('img.home-hero-image');
    if(!img){
      img = document.createElement('img');
      img.className = 'home-hero-image';
      img.alt = '';
      img.setAttribute('aria-hidden', 'true');
      img.decoding = 'async';
      hero.prepend(img);
    }
    return img;
  }

  function embeddedHeroSource(){
    const chunks = window.SKELETON_HOME_HERO_CHUNKS;
    if(!chunks || chunks.length < 4 || chunks.some(part => typeof part !== 'string' || !part.length)) return '';
    return 'data:image/jpeg;base64,' + chunks.join('');
  }

  function finishLoad(img, source, kind){
    img.dataset.heroVersion = HERO_VERSION;
    img.dataset.heroState = 'loaded';
    img.dataset.heroSource = source;
    img.dataset.heroKind = kind;
    img.onload = null;
    img.onerror = null;
  }

  function loadEmbeddedFallback(img){
    const source = embeddedHeroSource();
    if(!source){
      img.dataset.heroState = 'waiting-fallback';
      let waits = Number(img.dataset.heroFallbackWaits || 0);
      if(waits < 180){
        img.dataset.heroFallbackWaits = String(waits + 1);
        requestAnimationFrame(() => loadEmbeddedFallback(img));
      }else{
        img.dataset.heroState = 'failed';
      }
      return;
    }

    img.dataset.heroState = 'loading-fallback';
    img.dataset.heroSource = 'embedded';
    img.onload = () => finishLoad(img, 'embedded', 'embedded');
    img.onerror = () => {
      img.dataset.heroState = 'failed';
      img.onload = null;
      img.onerror = null;
    };
    img.src = source;
  }

  function tryPrimarySource(img, index){
    if(index >= PRIMARY_HERO_SOURCES.length){
      loadEmbeddedFallback(img);
      return;
    }

    const source = PRIMARY_HERO_SOURCES[index];
    img.dataset.heroVersion = HERO_VERSION;
    img.dataset.heroState = 'loading';
    img.dataset.heroIndex = String(index);
    img.dataset.heroSource = source;

    img.onload = () => finishLoad(img, source, 'asset');
    img.onerror = () => {
      img.onload = null;
      img.onerror = null;
      tryPrimarySource(img, index + 1);
    };
    img.src = source;
  }

  function mountHero(){
    const hero = getHero();
    if(!hero) return false;

    hero.style.setProperty('background-image', 'none', 'important');
    const img = getHeroImage(hero);

    if(
      img.dataset.heroVersion === HERO_VERSION &&
      img.dataset.heroState === 'loaded' &&
      img.complete &&
      img.naturalWidth > 0
    ){
      return true;
    }

    if(
      img.dataset.heroVersion === HERO_VERSION &&
      (img.dataset.heroState === 'loading' ||
       img.dataset.heroState === 'loading-fallback' ||
       img.dataset.heroState === 'waiting-fallback')
    ){
      return true;
    }

    img.dataset.heroFallbackWaits = '0';
    tryPrimarySource(img, 0);
    return true;
  }

  let tries = 0;
  function ensureHero(){
    if(mountHero()) return;
    if(++tries < 180) requestAnimationFrame(ensureHero);
  }

  ensureHero();
  window.addEventListener('pageshow', mountHero);
})();
