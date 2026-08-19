// Skeleton Mining Co. Home Screen hero loader v8.
// Hero bytes are stored as text chunks to avoid binary-upload corruption.
(function(){
  'use strict';
  const HERO_VERSION='8';

  function mountEmbeddedHero(){
    const chunks=window.SKELETON_HOME_HERO_CHUNKS;
    const hero=document.querySelector('#homeScreen .home-hero');
    if(!hero || !chunks || chunks.length<4 || chunks.some(v=>typeof v!=='string' || !v.length)) return false;

    hero.style.setProperty('background-image','none','important');
    let img=hero.querySelector('img.home-hero-image');
    if(!img){
      img=document.createElement('img');
      img.className='home-hero-image';
      img.alt='';
      img.setAttribute('aria-hidden','true');
      img.decoding='async';
      hero.prepend(img);
    }
    if(img.dataset.heroVersion!==HERO_VERSION){
      img.dataset.heroVersion=HERO_VERSION;
      img.src='data:image/jpeg;base64,'+chunks.join('');
    }
    return true;
  }

  let tries=0;
  function ensureHero(){
    if(mountEmbeddedHero()) return;
    if(++tries<180) requestAnimationFrame(ensureHero);
  }
  ensureHero();
  window.addEventListener('pageshow',mountEmbeddedHero);
})();
