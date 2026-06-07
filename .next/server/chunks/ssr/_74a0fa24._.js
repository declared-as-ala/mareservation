module.exports=[15618,a=>{"use strict";let b=(0,a.i(70106).default)("plus",[["path",{d:"M5 12h14",key:"1ays0h"}],["path",{d:"M12 5v14",key:"s699le"}]]);a.s(["Plus",()=>b],15618)},41710,a=>{"use strict";let b=(0,a.i(70106).default)("clock",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"M12 6v6l4 2",key:"mmk7yg"}]]);a.s(["Clock",()=>b],41710)},96221,a=>{"use strict";let b=(0,a.i(70106).default)("loader-circle",[["path",{d:"M21 12a9 9 0 1 1-6.219-8.56",key:"13zald"}]]);a.s(["Loader2",()=>b],96221)},70025,a=>{"use strict";var b=a.i(72131),c=a.i(12794),d=a.i(18544),e=a.i(33791),f=a.i(42871),g=class extends e.Subscribable{#a;#b=void 0;#c;#d;constructor(a,b){super(),this.#a=a,this.setOptions(b),this.bindMethods(),this.#e()}bindMethods(){this.mutate=this.mutate.bind(this),this.reset=this.reset.bind(this)}setOptions(a){let b=this.options;this.options=this.#a.defaultMutationOptions(a),(0,f.shallowEqualObjects)(this.options,b)||this.#a.getMutationCache().notify({type:"observerOptionsUpdated",mutation:this.#c,observer:this}),b?.mutationKey&&this.options.mutationKey&&(0,f.hashKey)(b.mutationKey)!==(0,f.hashKey)(this.options.mutationKey)?this.reset():this.#c?.state.status==="pending"&&this.#c.setOptions(this.options)}onUnsubscribe(){this.hasListeners()||this.#c?.removeObserver(this)}onMutationUpdate(a){this.#e(),this.#f(a)}getCurrentResult(){return this.#b}reset(){this.#c?.removeObserver(this),this.#c=void 0,this.#e(),this.#f()}mutate(a,b){return this.#d=b,this.#c?.removeObserver(this),this.#c=this.#a.getMutationCache().build(this.#a,this.options),this.#c.addObserver(this),this.#c.execute(a)}#e(){let a=this.#c?.state??(0,c.getDefaultState)();this.#b={...a,isPending:"pending"===a.status,isSuccess:"success"===a.status,isError:"error"===a.status,isIdle:"idle"===a.status,mutate:this.mutate,reset:this.reset}}#f(a){d.notifyManager.batch(()=>{if(this.#d&&this.hasListeners()){let b=this.#b.variables,c=this.#b.context,d={client:this.#a,meta:this.options.meta,mutationKey:this.options.mutationKey};if(a?.type==="success"){try{this.#d.onSuccess?.(a.data,b,c,d)}catch(a){Promise.reject(a)}try{this.#d.onSettled?.(a.data,null,b,c,d)}catch(a){Promise.reject(a)}}else if(a?.type==="error"){try{this.#d.onError?.(a.error,b,c,d)}catch(a){Promise.reject(a)}try{this.#d.onSettled?.(void 0,a.error,b,c,d)}catch(a){Promise.reject(a)}}}this.listeners.forEach(a=>{a(this.#b)})})}},h=a.i(37927);function i(a,c){let e=(0,h.useQueryClient)(c),[i]=b.useState(()=>new g(e,a));b.useEffect(()=>{i.setOptions(a)},[i,a]);let j=b.useSyncExternalStore(b.useCallback(a=>i.subscribe(d.notifyManager.batchCalls(a)),[i]),()=>i.getCurrentResult(),()=>i.getCurrentResult()),k=b.useCallback((a,b)=>{i.mutate(a,b).catch(f.noop)},[i]);if(j.error&&(0,f.shouldThrowError)(i.options.throwOnError,[j.error]))throw j.error;return{...j,mutate:k,mutateAsync:j.mutate}}a.s(["useMutation",()=>i],70025)},92e3,a=>{"use strict";let b=(0,a.i(70106).default)("circle-alert",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["line",{x1:"12",x2:"12",y1:"8",y2:"12",key:"1pkeuh"}],["line",{x1:"12",x2:"12.01",y1:"16",y2:"16",key:"4dfq90"}]]);a.s(["AlertCircle",()=>b],92e3)},41632,a=>{"use strict";var b=a.i(62477);async function c(){try{let a=await (0,b.apiGetRaw)("/admin/dashboard/stats");return a?.data??a??{}}catch{return{}}}async function d(a){try{let c=new URLSearchParams;a?.status&&c.set("status",a.status),a?.page&&c.set("page",String(a.page));let d=c.toString(),e=await (0,b.apiGetRaw)(`/admin/reservations${d?`?${d}`:""}`),f=e?.reservations;return Array.isArray(f)?f:[]}catch{return[]}}async function e(a,c){return(0,b.apiPatchRaw)(`/admin/reservations/${a}/force-cancel`,{reason:c})}async function f(a,c){return(0,b.apiPatchRaw)(`/admin/reservations/${a}/mark-refunded`,{reason:c})}async function g(a,c){return(0,b.apiPostRaw)(`/admin/reservations/${a}/note`,{note:c})}async function h(a){try{let c=new URLSearchParams;a?.page&&c.set("page",String(a.page)),a?.limit&&c.set("limit",String(a.limit)),a?.type&&c.set("type",a.type),a?.city&&c.set("city",a.city),a?.q&&c.set("q",a.q),a?.ownerId&&c.set("ownerId",a.ownerId),a?.withoutOwner&&c.set("withoutOwner","1"),a?.archived&&c.set("archived",a.archived);let d=c.toString(),e=await (0,b.apiGetRaw)(`/admin/venues${d?`?${d}`:""}`),f=e?.venues;return Array.isArray(f)?f:[]}catch{return[]}}async function i(a){try{let c=new URLSearchParams;c.set("type",a),c.set("page","1"),c.set("limit","1");let d=await (0,b.apiGetRaw)(`/admin/venues?${c.toString()}`);return Number(d?.total??0)}catch{return 0}}async function j(a){return(0,b.apiDeleteRaw)(`/admin/venues/${a}`)}async function k(a,c){return(0,b.apiPostRaw)(`/admin/venues/${a}/archive`,{reason:c})}async function l(a){return(0,b.apiPostRaw)(`/admin/venues/${a}/restore`,{})}async function m(){try{let a=await (0,b.apiGetRaw)("/admin/owners"),c=a?.data;return Array.isArray(c)?c:[]}catch{return[]}}async function n(a,c){return(0,b.apiPatchRaw)(`/admin/venues/${a}/owner`,{ownerId:c})}async function o(a,c){return(0,b.apiPatchRaw)(`/admin/venues/${a}`,c)}async function p(a){return(0,b.apiPostRaw)("/admin/venues",a)}async function q(a){try{let c=a?.page?`?page=${a.page}`:"",d=await (0,b.apiGetRaw)(`/admin/users${c}`),e=d?.users;return Array.isArray(e)?e:[]}catch{return[]}}async function r(){try{let a=await (0,b.apiGetRaw)("/admin/events");return Array.isArray(a)?a:[]}catch{return[]}}async function s(a){let c=new URLSearchParams;a?.status&&c.set("approvalStatus",a.status),a?.q&&c.set("q",a.q);let d=c.toString(),e=await (0,b.apiGetRaw)(`/admin/events${d?`?${d}`:""}`);return Array.isArray(e)?e:[]}async function t(a){return(0,b.apiPatchRaw)(`/admin/events/${a}/approve`,{})}async function u(a,c){return(0,b.apiPatchRaw)(`/admin/events/${a}/reject`,{reason:c})}async function v(a,c){return(0,b.apiPatchRaw)(`/admin/events/${a}/request-changes`,{note:c})}async function w(a,c){return(0,b.apiPatchRaw)(`/admin/events/${a}`,c)}async function x(a,c,d){try{let e=new URLSearchParams;e.set("venueId",a),c&&e.set("virtualTourId",c),d&&e.set("sceneId",d);let f=e.toString(),g=await (0,b.apiGetRaw)(`/admin/table-placements?${f}`),h=Array.isArray(g)?g:g?.data??g?.placements;return Array.isArray(h)?h:[]}catch{return[]}}async function y(a){return(0,b.apiPostRaw)("/admin/table-placements",a)}async function z(a,c){return(0,b.apiPatchRaw)(`/admin/table-placements/${a}`,c)}async function A(a){await b.api.delete(`/admin/table-placements/${a}`)}async function B(a){try{let c=await (0,b.apiGetRaw)(`/admin/venues/${a}/tables`),d=c?.data;return Array.isArray(d)?d:[]}catch{return[]}}async function C(a){return(0,b.apiPostRaw)("/admin/tables",a)}async function D(a,c){return(0,b.apiPatchRaw)(`/admin/tables/${a}`,c)}async function E(a){await b.api.delete(`/admin/tables/${a}`)}async function F(a){try{let c=await (0,b.apiGetRaw)(`/admin/reservable-units?venueId=${encodeURIComponent(a)}`);return c?.data??[]}catch{return[]}}async function G(){try{let a=await (0,b.apiGetRaw)("/admin/banner-slides"),c=Array.isArray(a)?a:a?.data??a?.bannerSlides;return Array.isArray(c)?c:[]}catch{return[]}}async function H(a){return b.api.post("/admin/banner-slides",a)}async function I(a,c){return(0,b.apiPatchRaw)(`/admin/banner-slides/${a}`,c)}async function J(a){await b.api.delete(`/admin/banner-slides/${a}`)}async function K(){try{let a=await (0,b.apiGetRaw)("/admin/categories"),c=Array.isArray(a)?a:a?.data??a?.categories;return Array.isArray(c)?c:[]}catch{return[]}}async function L(a){return(0,b.apiPostRaw)("/admin/categories",a)}async function M(a,c){return(0,b.apiPatchRaw)(`/admin/categories/${a}`,c)}async function N(a){await b.api.delete(`/admin/categories/${a}`)}async function O(a,c){return(0,b.apiPatchRaw)(`/admin/users/${a}`,c)}async function P(a){await b.api.delete(`/admin/users/${a}`)}async function Q(){try{let a=await (0,b.apiGetRaw)("/admin/settings");return a?.data??a??{}}catch{return{}}}async function R(a){return(0,b.apiPatchRaw)("/admin/settings",a)}async function S(a){try{let c=new URLSearchParams;a?.q&&c.set("q",a.q),a?.city&&c.set("city",a.city),a?.page&&c.set("page",String(a.page));let d=c.toString(),e=await (0,b.apiGetRaw)(`/admin/hotels${d?`?${d}`:""}`);return{hotels:e?.hotels??[],total:e?.total??0}}catch{return{hotels:[],total:0}}}async function T(a){try{let c=await (0,b.apiGetRaw)(`/admin/hotels/${a}`);return c?.data??null}catch{return null}}async function U(a){try{let c=await (0,b.apiGetRaw)(`/admin/hotels/${a}/rooms`);return c?.rooms??[]}catch{return[]}}async function V(a,c){let d=await (0,b.apiPostRaw)(`/admin/hotels/${a}/rooms`,c);return d?.data??d}async function W(a,c){let d=await (0,b.apiPatchRaw)(`/admin/rooms/${a}`,c);return d?.data??d}async function X(a){await b.api.delete(`/admin/rooms/${a}`)}async function Y(a,c){let d=await (0,b.apiPostRaw)(`/admin/rooms/${a}/scenes`,c);return d?.data??d}async function Z(a,c){try{let d=new URLSearchParams;c?.status&&d.set("status",c.status),c?.page&&d.set("page",String(c.page));let e=d.toString(),f=await (0,b.apiGetRaw)(`/admin/hotels/${a}/bookings${e?`?${e}`:""}`);return{bookings:f?.bookings??[],total:f?.total??0}}catch{return{bookings:[],total:0}}}async function $(a){try{let c=await (0,b.apiGetRaw)(`/admin/hotels/${a}/scenes`);return{scenes:c?.scenes??[],hotspots:c?.hotspots??[]}}catch{return{scenes:[],hotspots:[]}}}async function _(a,c){let d=await (0,b.apiPatchRaw)(`/admin/scenes/${a}`,c);return d?.data??d}async function aa(a){await b.api.delete(`/admin/scenes/${a}`)}async function ab(a){let c=await (0,b.apiPostRaw)("/admin/scene-hotspots",a);return c?.data??c}async function ac(a){await b.api.delete(`/admin/tour-hotspots/${a}`)}async function ad(a){try{let c=await (0,b.apiGetRaw)(`/admin/venues/${a}/scenes`);return{scenes:c?.scenes??[],hotspots:c?.hotspots??[]}}catch{return{scenes:[],hotspots:[]}}}async function ae(a,c){let d=await (0,b.apiPostRaw)(`/admin/venues/${a}/scenes`,c);return d?.data??d}async function af(){try{let a=await (0,b.apiGetRaw)("/categories"),c=Array.isArray(a)?a:a?.data??a?.categories;return Array.isArray(c)?c:[]}catch{return[]}}a.s(["addAdminReservationNote",()=>g,"approveAdminEvent",()=>t,"archiveAdminVenue",()=>k,"assignVenueOwner",()=>n,"createAdminBannerSlide",()=>H,"createAdminCategory",()=>L,"createAdminHotelRoom",()=>V,"createAdminRoomScene",()=>Y,"createAdminSceneHotspot",()=>ab,"createAdminTable",()=>C,"createAdminTablePlacement",()=>y,"createAdminVenue",()=>p,"createAdminVenueScene",()=>ae,"deleteAdminBannerSlide",()=>J,"deleteAdminCategory",()=>N,"deleteAdminHotelRoom",()=>X,"deleteAdminSceneHotspot",()=>ac,"deleteAdminTable",()=>E,"deleteAdminTablePlacement",()=>A,"deleteAdminUser",()=>P,"deleteAdminVenue",()=>j,"deleteAdminVenueScene",0,aa,"fetchAdminBannerSlides",()=>G,"fetchAdminCategories",()=>K,"fetchAdminEventModeration",()=>s,"fetchAdminEvents",()=>r,"fetchAdminHotelBookings",()=>Z,"fetchAdminHotelById",()=>T,"fetchAdminHotelRooms",()=>U,"fetchAdminHotelScenes",()=>$,"fetchAdminHotels",()=>S,"fetchAdminOwners",()=>m,"fetchAdminReservableUnits",()=>F,"fetchAdminReservations",()=>d,"fetchAdminSettings",()=>Q,"fetchAdminStats",()=>c,"fetchAdminTablePlacements",()=>x,"fetchAdminUsers",()=>q,"fetchAdminVenueScenes",()=>ad,"fetchAdminVenueTables",()=>B,"fetchAdminVenues",()=>h,"fetchAdminVenuesTotalByType",()=>i,"fetchPublicCategories",()=>af,"forceCancelAdminReservation",()=>e,"markAdminReservationRefunded",()=>f,"rejectAdminEvent",()=>u,"requestAdminEventChanges",()=>v,"restoreAdminVenue",()=>l,"updateAdminBannerSlide",()=>I,"updateAdminCategory",()=>M,"updateAdminEvent",()=>w,"updateAdminHotelRoom",()=>W,"updateAdminSettings",()=>R,"updateAdminTable",()=>D,"updateAdminTablePlacement",()=>z,"updateAdminUser",()=>O,"updateAdminVenue",()=>o,"updateAdminVenueScene",0,_])},62722,a=>{"use strict";let b=(0,a.i(70106).default)("circle-x",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"m15 9-6 6",key:"1uzhvr"}],["path",{d:"m9 9 6 6",key:"z0biqf"}]]);a.s(["XCircle",()=>b],62722)},62219,a=>{"use strict";let b=(0,a.i(70106).default)("badge-check",[["path",{d:"M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z",key:"3c2336"}],["path",{d:"m9 12 2 2 4-4",key:"dzmm74"}]]);a.s(["BadgeCheck",()=>b],62219)},84505,a=>{"use strict";let b=(0,a.i(70106).default)("download",[["path",{d:"M12 15V3",key:"m9g1x1"}],["path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4",key:"ih7n3h"}],["path",{d:"m7 10 5 5 5-5",key:"brsn70"}]]);a.s(["Download",()=>b],84505)},1199,a=>{"use strict";let b=(0,a.i(70106).default)("receipt",[["path",{d:"M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z",key:"q3az6g"}],["path",{d:"M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8",key:"1h4pet"}],["path",{d:"M12 17.5v-11",key:"1jc1ny"}]]);a.s(["Receipt",()=>b],1199)},7525,79153,2545,a=>{"use strict";let b=(0,a.i(70106).default)("banknote",[["rect",{width:"20",height:"12",x:"2",y:"6",rx:"2",key:"9lu3g6"}],["circle",{cx:"12",cy:"12",r:"2",key:"1c9p78"}],["path",{d:"M6 12h.01M18 12h.01",key:"113zkx"}]]);function c(a){return new Intl.NumberFormat("fr-TN",{minimumFractionDigits:3}).format(a)}function d(a){return new Date(a).toLocaleDateString("fr-TN",{day:"2-digit",month:"long",year:"numeric"})}function e(a,b){let e="object"==typeof a.venueId?a.venueId:null,f="object"==typeof a.ownerId?a.ownerId:null,g=b??f?.name??"—",h=e?.name??"—",i=a.items.map((a,b)=>`
      <tr>
        <td>${a.reservationCode??`#${b+1}`}</td>
        <td>${d(a.startAt)}</td>
        <td>${d(a.endAt)}</td>
        <td class="num">${c(a.gross)} TND</td>
        <td class="num neg">-${c(a.commission)} TND</td>
        <td class="num pos">${c(a.net)} TND</td>
      </tr>`).join(""),j=`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <title>Virement — ${h}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 13px; color: #1a1a1a; background: #fff; padding: 40px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #d4af37; padding-bottom: 20px; margin-bottom: 28px; }
    .brand { font-size: 22px; font-weight: 700; color: #1a1a1a; letter-spacing: -0.5px; }
    .brand span { color: #d4af37; }
    .invoice-meta { text-align: right; font-size: 12px; color: #666; }
    .invoice-meta strong { display: block; font-size: 15px; font-weight: 700; color: #1a1a1a; margin-bottom: 4px; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 28px; }
    .meta-block h3 { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #999; margin-bottom: 8px; }
    .meta-block p { font-size: 13px; color: #1a1a1a; line-height: 1.6; }
    .status-badge { display: inline-block; padding: 2px 10px; border-radius: 99px; font-size: 11px; font-weight: 600; background: #f0f9f4; color: #16a34a; border: 1px solid #bbf7d0; }
    .totals-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-bottom: 28px; }
    .total-card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px 16px; }
    .total-card .label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.8px; color: #9ca3af; margin-bottom: 6px; }
    .total-card .value { font-size: 18px; font-weight: 700; }
    .value.gross { color: #1a1a1a; }
    .value.commission { color: #dc2626; }
    .value.net { color: #16a34a; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    thead th { background: #f9fafb; border-bottom: 1px solid #e5e7eb; padding: 10px 12px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.6px; color: #6b7280; font-weight: 600; }
    tbody td { padding: 9px 12px; border-bottom: 1px solid #f3f4f6; font-size: 12px; color: #374151; vertical-align: middle; }
    tbody tr:last-child td { border-bottom: none; }
    td.num { text-align: right; font-variant-numeric: tabular-nums; }
    td.neg { color: #dc2626; }
    td.pos { color: #16a34a; font-weight: 600; }
    tfoot td { padding: 10px 12px; font-weight: 700; font-size: 13px; border-top: 2px solid #e5e7eb; }
    tfoot td.num { text-align: right; }
    .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af; text-align: center; }
    @media print {
      body { padding: 20px; }
      @page { margin: 1.5cm; size: A4; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">Ma <span>R\xe9servation</span></div>
      <div style="font-size: 11px; color: #9ca3af; margin-top: 4px;">Plateforme de r\xe9servation premium</div>
    </div>
    <div class="invoice-meta">
      <strong>Relev\xe9 de virement</strong>
      <span>R\xe9f\xe9rence : ${a._id.slice(-8).toUpperCase()}</span><br />
      <span>G\xe9n\xe9r\xe9 le ${d(new Date().toISOString())}</span>
    </div>
  </div>

  <div class="meta-grid">
    <div class="meta-block">
      <h3>Propri\xe9taire</h3>
      <p><strong>${g}</strong></p>
      ${f?.email?`<p>${f.email}</p>`:""}
      ${f?.phone?`<p>${f.phone}</p>`:""}
    </div>
    <div class="meta-block">
      <h3>\xc9tablissement</h3>
      <p><strong>${h}</strong></p>
      <p>P\xe9riode : ${d(a.periodStart)} → ${d(a.periodEnd)}</p>
      <p>Statut : <span class="status-badge">${"paid"===a.status?"Payé":"approved"===a.status?"Approuvé":"pending"===a.status?"En attente":"on_hold"===a.status?"Suspendu":"Rejeté"}</span></p>
      ${"paid"===a.status&&a.paidAt?`<p style="margin-top:4px;font-size:11px;color:#6b7280;">Pay\xe9 le ${d(a.paidAt)}${a.paymentReference?` \xb7 R\xe9f : ${a.paymentReference}`:""}</p>`:""}
    </div>
  </div>

  <div class="totals-row">
    <div class="total-card">
      <div class="label">Montant brut</div>
      <div class="value gross">${c(a.gross)} TND</div>
    </div>
    <div class="total-card">
      <div class="label">Commission plateforme (${a.commissionRate??"—"}%)</div>
      <div class="value commission">-${c(a.commission)} TND</div>
    </div>
    <div class="total-card">
      <div class="label">Net propri\xe9taire</div>
      <div class="value net">${c(a.net)} TND</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Code r\xe9servation</th>
        <th>Arriv\xe9e</th>
        <th>D\xe9part</th>
        <th style="text-align:right">Brut</th>
        <th style="text-align:right">Commission</th>
        <th style="text-align:right">Net</th>
      </tr>
    </thead>
    <tbody>
      ${i}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="3" style="font-weight:700;">Total (${a.items.length} r\xe9servation${a.items.length>1?"s":""})</td>
        <td class="num">${c(a.gross)} TND</td>
        <td class="num neg">-${c(a.commission)} TND</td>
        <td class="num pos">${c(a.net)} TND</td>
      </tr>
    </tfoot>
  </table>

  <div class="footer">
    Ma R\xe9servation \xb7 Plateforme de r\xe9servation premium \xb7 Ce document est g\xe9n\xe9r\xe9 automatiquement.
  </div>

  <script>
    window.onload = function() { window.print(); };
  </script>
</body>
</html>`,k=window.open("","_blank","width=900,height=700");k&&(k.document.write(j),k.document.close())}a.s(["BanknoteIcon",()=>b],7525),a.s(["printPayout",()=>e],79153);var f=a.i(62477);async function g(){return(await (0,f.apiFetch)("/payouts/owner/balance")).data}async function h(a){let b=new URLSearchParams;a?.page&&b.set("page",String(a.page)),a?.limit&&b.set("limit",String(a.limit)),a?.status&&b.set("status",a.status);let c=await (0,f.apiFetch)(`/payouts/owner?${b}`);return{data:c.data??[],meta:c.meta??{total:0,page:1,pages:1}}}async function i(a){let b=new URLSearchParams;a?.page&&b.set("page",String(a.page)),a?.status&&b.set("status",a.status),a?.venueId&&b.set("venueId",a.venueId),a?.ownerId&&b.set("ownerId",a.ownerId);let c=await (0,f.apiFetch)(`/payouts/admin?${b}`);return{data:c.data??[],meta:c.meta??{total:0,page:1,pages:1}}}async function j(a){return(await (0,f.apiPostRaw)("/payouts/admin/generate",a)).data}async function k(a,b){return(await (0,f.apiPatchRaw)(`/payouts/admin/${a}/approve`,{notes:b})).data}async function l(a,b){return(await (0,f.apiPatchRaw)(`/payouts/admin/${a}/mark-paid`,b??{})).data}async function m(a,b){return(await (0,f.apiPatchRaw)(`/payouts/admin/${a}/hold`,{reason:b})).data}async function n(a,b){return(await (0,f.apiPatchRaw)(`/payouts/admin/${a}/reject`,{reason:b})).data}a.s(["adminApprovePayout",()=>k,"adminGeneratePayout",()=>j,"adminHoldPayout",()=>m,"adminMarkPayoutPaid",()=>l,"adminRejectPayout",()=>n,"fetchAdminPayouts",()=>i,"fetchOwnerBalance",()=>g,"fetchOwnerPayouts",()=>h],2545)}];

//# sourceMappingURL=_74a0fa24._.js.map