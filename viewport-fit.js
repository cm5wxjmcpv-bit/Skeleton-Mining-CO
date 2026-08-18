// Keep the live mine inside Safari's actual visible viewport and avoid page scrolling.
(function(){
  const root=document.documentElement;
  function fitVisibleViewport(){
    const height=Math.max(320,Math.round(window.visualViewport?.height||window.innerHeight||document.documentElement.clientHeight));
    root.style.setProperty('--app-height',`${height}px`);
  }

  const showScreenBeforeViewportFit=showScreen;
  showScreen=function(id){
    showScreenBeforeViewportFit(id);
    document.body.classList.toggle('mine-play-screen',id==='mineScreen');
    fitVisibleViewport();
  };

  const renderMineControlsBeforeViewportFit=renderMineControls;
  renderMineControls=function(){
    renderMineControlsBeforeViewportFit();
    document.body.classList.toggle('round-running',!!running);
  };

  window.addEventListener('resize',fitVisibleViewport,{passive:true});
  window.addEventListener('orientationchange',fitVisibleViewport,{passive:true});
  if(window.visualViewport){
    window.visualViewport.addEventListener('resize',fitVisibleViewport,{passive:true});
    window.visualViewport.addEventListener('scroll',fitVisibleViewport,{passive:true});
  }

  document.body.classList.toggle('mine-play-screen',document.querySelector('.active-screen')?.id==='mineScreen');
  document.body.classList.toggle('round-running',!!running);
  fitVisibleViewport();
})();
