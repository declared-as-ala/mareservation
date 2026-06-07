(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,30664,e=>{"use strict";var t=e.i(43476),r=e.i(71645),i=e.i(47163);function n({imageUrl:n,markers:a,selectedMarkerId:l,mode:s,onPositionClick:o,onMarkerClick:c,onMarkerMoved:u,navHotspots:d,onNavHotspotClick:p,scenes:b,activeSceneId:f,onSceneChange:x}){let h=(0,r.useRef)(null),m=(0,r.useRef)(null),v=(0,r.useRef)(null),[g,y]=(0,r.useState)(!1),w=(0,r.useRef)({onPositionClick:o,onMarkerClick:c,onMarkerMoved:u,onNavHotspotClick:p});w.current={onPositionClick:o,onMarkerClick:c,onMarkerMoved:u,onNavHotspotClick:p};let k=(0,r.useRef)(s);k.current=s;let $=(0,r.useRef)(l);$.current=l,(0,r.useEffect)(()=>{if(!h.current)return;let t=!1;if(y(!1),m.current){try{m.current.destroy?.()}catch{}m.current=null,v.current=null}return(async()=>{let[{Viewer:r},{MarkersPlugin:i}]=await Promise.all([e.A(39931),e.A(98528)]);if(t||!h.current)return;let a=new r({container:h.current,panorama:n,navbar:!1,defaultYaw:0,defaultPitch:0,defaultZoomLvl:0,maxFov:95,minFov:35,fisheye:!1,touchmoveTwoFingers:!1,mousewheelCtrlKey:!1,plugins:[[i,{}]]});m.current=a,a.addEventListener("ready",()=>{t||(v.current=a.getPlugin(i),y(!0))}),a.addEventListener("click",e=>{let t=e.data;if(!t)return;let{yaw:r,pitch:i}=t,n=k.current;"number"==typeof r&&"number"==typeof i&&("place"===n?w.current.onPositionClick?.(r,i):"move"===n&&$.current&&w.current.onMarkerMoved?.($.current,r,i))})})(),()=>{if(t=!0,m.current){try{m.current.destroy?.()}catch{}m.current=null,v.current=null}}},[n]),(0,r.useEffect)(()=>{let e=v.current;e&&g&&(e.clearMarkers(),a.forEach(t=>{let r,i,n,a,s,o,c;if("yaw_pitch"!==t.placement.positionType||null==t.placement.yaw||null==t.placement.pitch)return;let u=t.placement._id===l,d=t.table?.defaultStatus==="available",p=t.table?.name||`T${t.table?.tableNumber??"?"}`,b=d?"Disponible":t.table?.defaultStatus==="reserved"?"Réservée":"Indisponible";e.addMarker({id:t.placement._id,position:{yaw:t.placement.yaw,pitch:t.placement.pitch},html:(r=t.table?.defaultStatus==="available",i=t.table?.defaultStatus==="blocked",n=t.table?.isVip,a=u?44:36,s=r?n?"#f59e0b":"#22c55e":"#ef4444",o=t.table?.name&&t.table.name.length<=4?t.table.name:String(t.table?.tableNumber??"?"),c=r&&!u?`<div style="
        position:absolute;inset:-6px;border-radius:50%;
        border:2px solid ${s};
        opacity:0.4;
        animation:psv-pulse 2s ease-in-out infinite;
      "></div>`:"",`<div style="position:relative;width:${a}px;height:${a+32}px;cursor:${r||i?"pointer":"default"};display:flex;flex-direction:column;align-items:center;gap:4px;">
  <div style="
    background:${r?n?"rgba(245,158,11,0.95)":"rgba(34,197,94,0.95)":"rgba(239,68,68,0.90)"};
    color:#fff;
    font-family:system-ui,-apple-system,sans-serif;
    font-size:9px;
    font-weight:800;
    padding:3px 9px;
    border-radius:20px;
    white-space:nowrap;
    box-shadow:0 2px 8px rgba(0,0,0,0.5);
    letter-spacing:0.3px;
    pointer-events:none;
    user-select:none;
    flex-shrink:0;
  ">${r?n?"★ VIP":"✓ Disponible":"✗ Réservée"}</div>
  <div style="position:relative;width:${a}px;height:${a}px;flex-shrink:0;opacity:${r?"1":"0.65"};">
    ${c}
    <div style="
      width:${a}px;height:${a}px;border-radius:50%;
      background:${s};
      border:2.5px solid ${u?"#fbbf24":"rgba(255,255,255,0.85)"};
      ${u?"box-shadow:0 0 0 3px rgba(251,191,36,0.9),0 4px 20px rgba(0,0,0,0.6);":"box-shadow:0 3px 14px rgba(0,0,0,0.6);"}
      display:flex;align-items:center;justify-content:center;
      font-family:system-ui,-apple-system,sans-serif;
      font-size:${a>=40?15:12}px;font-weight:900;color:#fff;
      user-select:none;
      text-shadow:0 1px 4px rgba(0,0,0,0.5);
      transition:transform 0.15s ease;
    ">${o}</div>
  </div>
</div>`),anchor:"center center",tooltip:{content:`${p} \xb7 ${b} \xb7 ${t.table?.capacity??"?"} pers.${t.table?.price?" · "+t.table.price+" TND":""}`,position:"top center"},data:{placementId:t.placement._id}})}),d?.forEach(t=>{var r;e.addMarker({id:`__nav__${t.id}`,position:{yaw:t.yaw,pitch:t.pitch},html:(r=t.label,`<div style="position:relative;width:40px;height:40px;cursor:pointer;" title="${r.replace(/"/g,"&quot;")}">
  <div style="
    position:absolute;inset:-7px;border-radius:50%;
    border:2px solid #D4AF37;opacity:0.35;
    animation:psv-pulse 2s ease-in-out infinite;
  "></div>
  <div style="
    width:40px;height:40px;border-radius:50%;
    background:#D4AF37;
    border:2.5px solid rgba(255,255,255,0.9);
    box-shadow:0 3px 16px rgba(0,0,0,0.55),0 0 0 6px rgba(212,175,55,0.15);
    display:flex;align-items:center;justify-content:center;
  ">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M5 12h14M12 5l7 7-7 7"/>
    </svg>
  </div>
</div>`),anchor:"center center",tooltip:{content:`→ ${t.label}`,position:"top center"}})}))},[g,a,l,s,d]),(0,r.useEffect)(()=>{let e=v.current;if(!e||!g)return;let t=e=>{let t=e.marker?.id;"string"==typeof t&&(t.startsWith("__nav__")?w.current.onNavHotspotClick?.(t.slice(7)):w.current.onMarkerClick?.(t))};return e.addEventListener?.("select-marker",t),()=>{try{e.removeEventListener?.("select-marker",t)}catch{}}},[g]),(0,r.useEffect)(()=>{if(!m.current||!g)return;let e=setTimeout(()=>{try{m.current?.autoSize()}catch{}},100);return()=>clearTimeout(e)},[g]);let z="place"===s?"Cliquez pour placer une table":"move"===s&&l?"Cliquez pour repositionner la table":null,j=b&&b.length>1;return(0,t.jsxs)("div",{style:{position:"absolute",inset:0},children:[(0,t.jsx)("div",{ref:h,style:{width:"100%",height:"100%"}}),!g&&(0,t.jsx)("div",{className:"absolute inset-0 flex items-center justify-center bg-zinc-950/80 z-10",children:(0,t.jsxs)("div",{className:"flex flex-col items-center gap-2 text-zinc-400",children:[(0,t.jsx)("div",{className:"size-8 border-2 border-zinc-700 border-t-amber-400 rounded-full animate-spin"}),(0,t.jsx)("span",{className:"text-sm",children:"Chargement de la vue 360..."})]})}),z&&g&&(0,t.jsx)("div",{className:"absolute top-3 left-1/2 -translate-x-1/2 z-20 bg-[#D4AF37] text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg pointer-events-none",children:z}),j&&g&&(0,t.jsx)("div",{className:"absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex gap-1.5 bg-zinc-950/90 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-lg border border-zinc-800",children:b.map(e=>{let r=e._id===f;return(0,t.jsxs)("button",{type:"button",onClick:()=>x?.(e._id),className:(0,i.cn)("flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all duration-200",r?"bg-amber-400 text-zinc-950":"text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"),title:e.name,children:[(0,t.jsx)("span",{className:(0,i.cn)("size-1.5 rounded-full shrink-0",r?"bg-zinc-950":"bg-zinc-600")}),e.name]},e._id)})})]})}e.s(["default",()=>n])},10475,e=>{e.n(e.i(30664))},39931,e=>{e.v(t=>Promise.all(["static/chunks/caea663d0bb4ab63.js"].map(t=>e.l(t))).then(()=>t(5883)))},98528,e=>{e.v(t=>Promise.all(["static/chunks/35967895407aeb3c.js","static/chunks/caea663d0bb4ab63.js"].map(t=>e.l(t))).then(()=>t(53916)))}]);