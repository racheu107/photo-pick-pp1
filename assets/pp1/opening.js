/* PP-1 오프닝 A (전원 켜기). 앱을 열 때 한 번, 탭하면 건너뜀, 동작 줄이기면 0.7초 정지 화면 */
(function(){
  try{ if(sessionStorage.getItem('pp1-opened')) return; sessionStorage.setItem('pp1-opened','1'); }catch(e){}
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var el = document.createElement('div');
  el.className = 'pp-open'; el.setAttribute('aria-hidden','true');
  el.innerHTML =
    '<div class="pp-open__core"><span class="pp-open__ring"></span><span class="pp-open__ring"></span><span class="pp-open__ring"></span><span class="pp-open__led"></span></div>' +
    '<div class="pp-open__oled"><span class="pp-open__type">PP-1 READY</span><i></i></div>' +
    '<div class="pp-open__brand"><b>Photo Pick</b><span>사진은 많이, 고르는 건 가볍게</span></div>';
  var done = false;
  function close(){ if(done) return; done = true; el.classList.add('is-out'); setTimeout(function(){ el.remove(); }, 380); }
  el.addEventListener('click', close);
  function mount(){ (document.querySelector('.phone')||document.body).appendChild(el); setTimeout(close, reduce ? 700 : 1750); }
  if(document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);
})();
