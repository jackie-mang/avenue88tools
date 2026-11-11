/* Shared agent layer: fills the agent's details into each page and builds the WhatsApp links.
   Reads window.AGENT from agent.js. Pages opt in with <html data-agent-page="home|model|sun">. */
(function(){
  'use strict';
  var A = window.AGENT || {};
  var PROJECT = 'Thomson Reserve';
  var first = String(A.name || '').split(' ')[0] || 'there';
  var digits = String(A.whatsapp || '').replace(/\D/g, '');
  function wa(msg){ return 'https://wa.me/' + digits + '?text=' + encodeURIComponent(msg); }
  function phone(){
    var d = digits;
    if(d.length === 10 && d.indexOf('65') === 0) return '+65 ' + d.slice(2, 6) + ' ' + d.slice(6);
    return '+' + d;
  }
  var ID = A.name + ', CEA Reg. No. ' + A.cea + ', ' + A.agency + ' (Licence No. ' + A.agencyLicence + ')';
  var MSG = {
    general: 'Hi ' + first + ', I\'m looking at ' + PROJECT + '. Please send me the latest price list and the units still available.',
    analysis: 'Hi ' + first + ', please send me a price analysis for ' + PROJECT + '.',
    stack: function(n, type){ return 'Hi ' + first + ', please send me a price analysis for ' + PROJECT + ' stack ' + n + (type ? ' (' + type + ')' : '') + '.'; },
    unit: function(u, type){ return 'Hi ' + first + ', I\'m looking at ' + PROJECT + ' ' + u + (type ? ' (' + type + ')' : '') + '. Is it still available, and what is today\'s price?'; },
    visit: 'Hi ' + first + ', I\'d like to visit the ' + PROJECT + ' showflat. When can you take me?'
  };
  window.AgentUI = {wa: wa, first: first, phone: phone, id: ID, msg: MSG, agent: A};

  var page = document.documentElement.getAttribute('data-agent-page');

  function fill(){
    var map = {name: A.name, first: first, cea: A.cea, title: A.title, brand: A.brand, agency: A.agency, licence: A.agencyLicence, phone: phone(), id: ID};
    [].forEach.call(document.querySelectorAll('[data-agent]'), function(el){
      var v = map[el.getAttribute('data-agent')];
      if(v){ el.textContent = v; } else if(el.hasAttribute('data-agent-optional')){ el.hidden = true; }
    });
    [].forEach.call(document.querySelectorAll('a[data-wa]'), function(a){
      var k = a.getAttribute('data-wa'), m;
      if(k === 'stack') m = MSG.stack(a.getAttribute('data-stack'), a.getAttribute('data-type'));
      else m = MSG[k] || MSG.general;
      a.href = wa(m); a.target = '_blank'; a.rel = 'noopener';
    });
    var ph = document.querySelector('[data-agent-photo]');
    if(ph){
      if(A.photo){ var im = document.createElement('img'); im.src = A.photo; im.alt = A.name; ph.textContent = ''; ph.appendChild(im); }
      else ph.textContent = String(A.name || '').split(' ').map(function(w){ return w.charAt(0); }).slice(0, 2).join('');
    }
  }

  function style(css){ var s = document.createElement('style'); s.textContent = css; document.head.appendChild(s); }
  function link(cls){ var a = document.createElement('a'); a.className = cls; a.target = '_blank'; a.rel = 'noopener'; return a; }

  /* ---------- 3D model: floating contact pill, agent line in the notes, #s26 deep link ---------- */
  function model(){
    var app = document.getElementById('app'); if(!app) return;
    style('.ag-pill{position:absolute;right:calc(12px + env(safe-area-inset-right,0px));top:64px;z-index:5;display:inline-flex;align-items:center;min-height:40px;max-width:calc(100% - 24px);padding:0 14px;border-radius:999px;' +
      'background:var(--chip-on);color:var(--chip-on-ink);font-size:15px;font-weight:600;text-decoration:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;box-shadow:0 2px 10px rgba(0,0,0,.22)}' +
      '.ag-pill:focus-visible{outline:2px solid var(--accent);outline-offset:2px}' +
      '@media (min-width:760px){.ag-pill{right:16px;top:72px}}' +
      '#app.film .ag-pill{display:none}');
    var pill = link('ag-pill'); app.appendChild(pill);
    var card = document.getElementById('card'), title = document.getElementById('card-title'), a = document.getElementById('card-a');
    function sync(){
      var t = card && !card.hidden ? (title.textContent || '') : '';
      var m = t.match(/^Stack (\d+)/);
      if(m){
        var type = (a.textContent || '').split(',')[0];
        pill.textContent = 'Ask about stack ' + m[1];
        pill.href = wa(MSG.stack(m[1], type));
      }else{
        pill.textContent = 'Ask ' + first;
        pill.href = wa(MSG.general);
      }
    }
    sync();
    if(card && window.MutationObserver){
      new MutationObserver(sync).observe(card, {attributes: true, childList: true, subtree: true, characterData: true});
    }
    var note = document.getElementById('note');
    if(note){ note.insertBefore(document.createTextNode('Shared by ' + ID + '. '), note.firstChild); }
    var h = (location.hash || '').match(/s(\d+)/);
    if(h){
      var tries = 0, iv = setInterval(function(){
        if(window.__tr && window.__tr.select){ clearInterval(iv); try{ window.__tr.select({stack: +h[1]}); }catch(e){} }
        else if(++tries > 100) clearInterval(iv);
      }, 100);
    }
  }

  /* ---------- sun study: contact strip above the tool, agent line in the disclaimer ---------- */
  function sun(){
    var wrap = document.querySelector('.wrap'); if(!wrap) return;
    style('.ag-bar{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px 14px;margin-bottom:12px;padding:8px 10px 8px 14px;background:var(--panel);border:1px solid var(--line);border-radius:14px}' +
      '.ag-bar a.ag-home{color:var(--ink);font-weight:600;text-decoration:none}' +
      '.ag-bar span{color:var(--muted);font-size:14.5px;flex:1 1 220px;min-width:0}' +
      '.ag-bar a.ag-btn{display:inline-flex;align-items:center;min-height:40px;padding:0 14px;border-radius:999px;background:var(--chip-on);color:var(--chip-on-ink);font-weight:600;font-size:15.5px;text-decoration:none}' +
      '.ag-bar a:focus-visible{outline:2px solid var(--accent);outline-offset:2px}');
    var bar = document.createElement('div'); bar.className = 'ag-bar';
    var home = document.createElement('a'); home.className = 'ag-home'; home.href = './'; home.textContent = '← ' + PROJECT;
    var who = document.createElement('span'); who.textContent = 'Shared by ' + A.name + ', CEA Reg. No. ' + A.cea;
    var btn = link('ag-btn');
    bar.appendChild(home); bar.appendChild(who); bar.appendChild(btn);
    wrap.insertBefore(bar, wrap.firstChild);
    var unit = document.getElementById('b-unit'), type = document.getElementById('b-type');
    function sync(){
      var u = unit ? unit.textContent : '';
      if(u){
        btn.textContent = 'Ask about ' + u;
        btn.href = wa(MSG.unit(u, (type.textContent || '').split(',')[0]));
      }else{ btn.textContent = 'Ask ' + first; btn.href = wa(MSG.general); }
    }
    sync();
    if(unit && window.MutationObserver){ new MutationObserver(sync).observe(unit, {childList: true, characterData: true, subtree: true}); }
    var disc = document.querySelector('.disc');
    if(disc){ var p = document.createElement('p'); p.textContent = 'Shared by ' + ID + '.'; disc.appendChild(p); }
  }

  function run(){
    fill();
    if(page === 'model') model();
    if(page === 'sun') sun();
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
})();
