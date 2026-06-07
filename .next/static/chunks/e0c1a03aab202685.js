(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,31278,e=>{"use strict";let t=(0,e.i(75254).default)("loader-circle",[["path",{d:"M21 12a9 9 0 1 1-6.219-8.56",key:"13zald"}]]);e.s(["Loader2",()=>t],31278)},63209,e=>{"use strict";let t=(0,e.i(75254).default)("circle-alert",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["line",{x1:"12",x2:"12",y1:"8",y2:"12",key:"1pkeuh"}],["line",{x1:"12",x2:"12.01",y1:"16",y2:"16",key:"4dfq90"}]]);e.s(["AlertCircle",()=>t],63209)},73884,e=>{"use strict";let t=(0,e.i(75254).default)("circle-x",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"m15 9-6 6",key:"1uzhvr"}],["path",{d:"m9 9 6 6",key:"z0biqf"}]]);e.s(["XCircle",()=>t],73884)},88712,e=>{"use strict";let t=(0,e.i(75254).default)("circle-dollar-sign",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8",key:"1h4pet"}],["path",{d:"M12 18V6",key:"zqpxq5"}]]);e.s(["CircleDollarSign",()=>t],88712)},25652,e=>{"use strict";let t=(0,e.i(75254).default)("trending-up",[["path",{d:"M16 7h6v6",key:"box55l"}],["path",{d:"m22 7-8.5 8.5-5-5L2 17",key:"1t1m79"}]]);e.s(["TrendingUp",()=>t],25652)},76838,e=>{"use strict";let t=(0,e.i(75254).default)("badge-check",[["path",{d:"M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z",key:"3c2336"}],["path",{d:"m9 12 2 2 4-4",key:"dzmm74"}]]);e.s(["BadgeCheck",()=>t],76838)},40160,e=>{"use strict";let t=(0,e.i(75254).default)("download",[["path",{d:"M12 15V3",key:"m9g1x1"}],["path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4",key:"ih7n3h"}],["path",{d:"m7 10 5 5 5-5",key:"brsn70"}]]);e.s(["Download",()=>t],40160)},50627,e=>{"use strict";let t=(0,e.i(75254).default)("receipt",[["path",{d:"M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z",key:"q3az6g"}],["path",{d:"M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8",key:"1h4pet"}],["path",{d:"M12 17.5v-11",key:"1jc1ny"}]]);e.s(["Receipt",()=>t],50627)},68562,35386,24319,e=>{"use strict";let t=(0,e.i(75254).default)("banknote",[["rect",{width:"20",height:"12",x:"2",y:"6",rx:"2",key:"9lu3g6"}],["circle",{cx:"12",cy:"12",r:"2",key:"1c9p78"}],["path",{d:"M6 12h.01M18 12h.01",key:"113zkx"}]]);function a(e){return new Intl.NumberFormat("fr-TN",{minimumFractionDigits:3}).format(e)}function s(e){return new Date(e).toLocaleDateString("fr-TN",{day:"2-digit",month:"long",year:"numeric"})}function i(e,t){let i="object"==typeof e.venueId?e.venueId:null,n="object"==typeof e.ownerId?e.ownerId:null,r=t??n?.name??"—",l=i?.name??"—",d=e.items.map((e,t)=>`
      <tr>
        <td>${e.reservationCode??`#${t+1}`}</td>
        <td>${s(e.startAt)}</td>
        <td>${s(e.endAt)}</td>
        <td class="num">${a(e.gross)} TND</td>
        <td class="num neg">-${a(e.commission)} TND</td>
        <td class="num pos">${a(e.net)} TND</td>
      </tr>`).join(""),o=`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <title>Virement — ${l}</title>
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
      <span>R\xe9f\xe9rence : ${e._id.slice(-8).toUpperCase()}</span><br />
      <span>G\xe9n\xe9r\xe9 le ${s(new Date().toISOString())}</span>
    </div>
  </div>

  <div class="meta-grid">
    <div class="meta-block">
      <h3>Propri\xe9taire</h3>
      <p><strong>${r}</strong></p>
      ${n?.email?`<p>${n.email}</p>`:""}
      ${n?.phone?`<p>${n.phone}</p>`:""}
    </div>
    <div class="meta-block">
      <h3>\xc9tablissement</h3>
      <p><strong>${l}</strong></p>
      <p>P\xe9riode : ${s(e.periodStart)} → ${s(e.periodEnd)}</p>
      <p>Statut : <span class="status-badge">${"paid"===e.status?"Payé":"approved"===e.status?"Approuvé":"pending"===e.status?"En attente":"on_hold"===e.status?"Suspendu":"Rejeté"}</span></p>
      ${"paid"===e.status&&e.paidAt?`<p style="margin-top:4px;font-size:11px;color:#6b7280;">Pay\xe9 le ${s(e.paidAt)}${e.paymentReference?` \xb7 R\xe9f : ${e.paymentReference}`:""}</p>`:""}
    </div>
  </div>

  <div class="totals-row">
    <div class="total-card">
      <div class="label">Montant brut</div>
      <div class="value gross">${a(e.gross)} TND</div>
    </div>
    <div class="total-card">
      <div class="label">Commission plateforme (${e.commissionRate??"—"}%)</div>
      <div class="value commission">-${a(e.commission)} TND</div>
    </div>
    <div class="total-card">
      <div class="label">Net propri\xe9taire</div>
      <div class="value net">${a(e.net)} TND</div>
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
      ${d}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="3" style="font-weight:700;">Total (${e.items.length} r\xe9servation${e.items.length>1?"s":""})</td>
        <td class="num">${a(e.gross)} TND</td>
        <td class="num neg">-${a(e.commission)} TND</td>
        <td class="num pos">${a(e.net)} TND</td>
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
</html>`,c=window.open("","_blank","width=900,height=700");c&&(c.document.write(o),c.document.close())}e.s(["BanknoteIcon",()=>t],68562),e.s(["printPayout",()=>i],35386);var n=e.i(15760);async function r(){return(await (0,n.apiFetch)("/payouts/owner/balance")).data}async function l(e){let t=new URLSearchParams;e?.page&&t.set("page",String(e.page)),e?.limit&&t.set("limit",String(e.limit)),e?.status&&t.set("status",e.status);let a=await (0,n.apiFetch)(`/payouts/owner?${t}`);return{data:a.data??[],meta:a.meta??{total:0,page:1,pages:1}}}async function d(e){let t=new URLSearchParams;e?.page&&t.set("page",String(e.page)),e?.status&&t.set("status",e.status),e?.venueId&&t.set("venueId",e.venueId),e?.ownerId&&t.set("ownerId",e.ownerId);let a=await (0,n.apiFetch)(`/payouts/admin?${t}`);return{data:a.data??[],meta:a.meta??{total:0,page:1,pages:1}}}async function o(e){return(await (0,n.apiPostRaw)("/payouts/admin/generate",e)).data}async function c(e,t){return(await (0,n.apiPatchRaw)(`/payouts/admin/${e}/approve`,{notes:t})).data}async function m(e,t){return(await (0,n.apiPatchRaw)(`/payouts/admin/${e}/mark-paid`,t??{})).data}async function p(e,t){return(await (0,n.apiPatchRaw)(`/payouts/admin/${e}/hold`,{reason:t})).data}async function x(e,t){return(await (0,n.apiPatchRaw)(`/payouts/admin/${e}/reject`,{reason:t})).data}e.s(["adminApprovePayout",()=>c,"adminGeneratePayout",()=>o,"adminHoldPayout",()=>p,"adminMarkPayoutPaid",()=>m,"adminRejectPayout",()=>x,"fetchAdminPayouts",()=>d,"fetchOwnerBalance",()=>r,"fetchOwnerPayouts",()=>l],24319)},60877,e=>{"use strict";var t=e.i(43476),a=e.i(71645),s=e.i(66027),i=e.i(63209),n=e.i(76838),r=e.i(68562),l=e.i(7486),d=e.i(63059),o=e.i(88712),c=e.i(3116),m=e.i(40160),p=e.i(31278),x=e.i(50627),u=e.i(25652),h=e.i(52754),b=e.i(73884),g=e.i(35386),f=e.i(47163),y=e.i(24319);let v={pending:{label:"En attente",color:"text-amber-400 bg-amber-400/10 border-amber-400/20",icon:c.Clock},approved:{label:"Approuvé",color:"text-blue-400 bg-blue-400/10 border-blue-400/20",icon:n.BadgeCheck},paid:{label:"Payé",color:"text-emerald-400 bg-emerald-400/10 border-emerald-400/20",icon:r.BanknoteIcon},on_hold:{label:"Suspendu",color:"text-orange-400 bg-orange-400/10 border-orange-400/20",icon:i.AlertCircle},rejected:{label:"Rejeté",color:"text-red-400 bg-red-400/10 border-red-400/20",icon:b.XCircle}};function j({status:e}){let a=v[e]??v.pending,s=a.icon;return(0,t.jsxs)("span",{className:(0,f.cn)("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",a.color),children:[(0,t.jsx)(s,{className:"h-3 w-3"}),a.label]})}function N(e){return new Intl.NumberFormat("fr-TN",{minimumFractionDigits:0}).format(Math.round(e))}function w(e){return new Date(e).toLocaleDateString("fr-TN",{day:"2-digit",month:"short",year:"numeric"})}function z({payout:e,onClick:a}){let s="object"==typeof e.venueId?e.venueId:null;return(0,t.jsxs)("button",{onClick:a,className:"group flex w-full items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 text-left transition hover:border-zinc-700 hover:bg-zinc-900",children:[(0,t.jsx)("div",{className:"flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-amber-400/10 text-amber-400",children:(0,t.jsx)(x.Receipt,{className:"h-5 w-5"})}),(0,t.jsxs)("div",{className:"min-w-0 flex-1",children:[(0,t.jsx)("p",{className:"truncate text-sm font-medium text-zinc-100",children:s?.name??"Établissement"}),(0,t.jsxs)("p",{className:"mt-0.5 text-xs text-zinc-500",children:[w(e.periodStart)," → ",w(e.periodEnd)," · ",e.items.length," rés."]})]}),(0,t.jsxs)("div",{className:"text-right",children:[(0,t.jsxs)("p",{className:"text-sm font-semibold text-emerald-400",children:[N(e.net)," TND"]}),(0,t.jsx)("p",{className:"mt-0.5 text-xs text-zinc-500",children:"net"})]}),(0,t.jsx)(j,{status:e.status}),(0,t.jsx)(d.ChevronRight,{className:"h-4 w-4 flex-shrink-0 text-zinc-600 transition group-hover:text-zinc-400"})]})}function k({payout:e,onClose:a}){let s="object"==typeof e.venueId?e.venueId:null;return(0,t.jsx)("div",{className:"fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center",onClick:a,children:(0,t.jsxs)("div",{className:"w-full max-w-lg rounded-t-2xl border border-zinc-800 bg-zinc-950 p-6 sm:rounded-2xl",onClick:e=>e.stopPropagation(),children:[(0,t.jsxs)("div",{className:"mb-5 flex items-start justify-between",children:[(0,t.jsxs)("div",{children:[(0,t.jsx)("h2",{className:"text-lg font-semibold text-zinc-100",children:s?.name??"Virement"}),(0,t.jsxs)("p",{className:"mt-0.5 text-sm text-zinc-500",children:[w(e.periodStart)," → ",w(e.periodEnd)]})]}),(0,t.jsx)(j,{status:e.status})]}),(0,t.jsx)("div",{className:"mb-5 grid grid-cols-3 gap-3",children:[{label:"Brut",value:e.gross,color:"text-zinc-100"},{label:"Commission",value:e.commission,color:"text-red-400"},{label:"Net",value:e.net,color:"text-emerald-400"}].map(({label:e,value:a,color:s})=>(0,t.jsxs)("div",{className:"rounded-lg border border-zinc-800 bg-zinc-900 p-3 text-center",children:[(0,t.jsx)("p",{className:(0,f.cn)("text-base font-bold",s),children:N(a)}),(0,t.jsxs)("p",{className:"text-xs text-zinc-500",children:[e," TND"]})]},e))}),(0,t.jsxs)("p",{className:"mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500",children:["Réservations incluses (",e.items.length,")"]}),(0,t.jsx)("div",{className:"max-h-52 space-y-1.5 overflow-y-auto pr-1",children:e.items.map((e,a)=>(0,t.jsxs)("div",{className:"flex items-center justify-between rounded-lg bg-zinc-900 px-3 py-2 text-xs",children:[(0,t.jsxs)("div",{children:[(0,t.jsx)("span",{className:"font-mono font-medium text-zinc-200",children:e.reservationCode??"—"}),(0,t.jsxs)("span",{className:"ml-2 text-zinc-500",children:[w(e.startAt)," → ",w(e.endAt)]})]}),(0,t.jsxs)("span",{className:"font-medium text-emerald-400",children:[N(e.net)," TND"]})]},a))}),"paid"===e.status&&e.paidAt&&(0,t.jsxs)("p",{className:"mt-4 text-xs text-zinc-500",children:["Payé le ",w(e.paidAt),e.paymentReference&&(0,t.jsxs)("span",{className:"ml-1",children:["· Réf: ",e.paymentReference]})]}),e.statusReason&&(0,t.jsx)("p",{className:"mt-3 rounded-lg border border-orange-500/20 bg-orange-500/10 px-3 py-2 text-xs text-orange-300",children:e.statusReason}),(0,t.jsxs)("div",{className:"mt-5 flex gap-2",children:[(0,t.jsxs)("button",{onClick:()=>(0,g.printPayout)(e),className:"flex flex-1 items-center justify-center gap-2 rounded-lg border border-amber-500/40 bg-amber-400/10 py-2.5 text-sm font-medium text-amber-300 hover:bg-amber-400/20",children:[(0,t.jsx)(m.Download,{className:"h-4 w-4"}),"Télécharger"]}),(0,t.jsx)("button",{onClick:a,className:"flex-1 rounded-lg border border-zinc-700 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800",children:"Fermer"})]})]})})}let $=[{key:"",label:"Tous"},{key:"pending",label:"En attente"},{key:"approved",label:"Approuvés"},{key:"paid",label:"Payés"},{key:"on_hold",label:"Suspendus"}];function P(){let[e,i]=(0,a.useState)(""),[n,r]=(0,a.useState)(null),{data:d,isLoading:c}=(0,s.useQuery)({queryKey:["owner-balance"],queryFn:y.fetchOwnerBalance}),{data:m,isLoading:b}=(0,s.useQuery)({queryKey:["owner-payouts",e],queryFn:()=>(0,y.fetchOwnerPayouts)({status:e||void 0})}),g=m?.data??[],v=g.filter(e=>"paid"===e.status).reduce((e,t)=>e+t.net,0),j=g.filter(e=>["pending","approved"].includes(e.status)).reduce((e,t)=>e+t.net,0);return(0,t.jsxs)("div",{className:"mx-auto max-w-3xl space-y-6 px-4 py-8",children:[(0,t.jsxs)("div",{children:[(0,t.jsx)("h1",{className:"text-2xl font-bold text-zinc-100",children:"Mes virements"}),(0,t.jsx)("p",{className:"mt-1 text-sm text-zinc-400",children:"Suivez vos commissions nettes et l'historique de vos paiements."})]}),(0,t.jsxs)("div",{className:"grid grid-cols-1 gap-4 sm:grid-cols-3",children:[(0,t.jsxs)("div",{className:"rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4",children:[(0,t.jsxs)("div",{className:"flex items-center justify-between",children:[(0,t.jsx)("p",{className:"text-xs font-medium uppercase tracking-wide text-zinc-500",children:"Solde non versé"}),(0,t.jsx)(h.Wallet,{className:"h-4 w-4 text-emerald-400"})]}),c?(0,t.jsx)(p.Loader2,{className:"mt-2 h-5 w-5 animate-spin text-zinc-500"}):(0,t.jsxs)("p",{className:"mt-1 text-2xl font-bold text-emerald-400",children:[N(d?.totalUnpaid??0)," TND"]})]}),(0,t.jsxs)("div",{className:"rounded-xl border border-zinc-800 bg-zinc-900/50 p-4",children:[(0,t.jsxs)("div",{className:"flex items-center justify-between",children:[(0,t.jsx)("p",{className:"text-xs font-medium uppercase tracking-wide text-zinc-500",children:"En cours"}),(0,t.jsx)(u.TrendingUp,{className:"h-4 w-4 text-amber-400"})]}),(0,t.jsxs)("p",{className:"mt-1 text-2xl font-bold text-amber-400",children:[N(j)," TND"]})]}),(0,t.jsxs)("div",{className:"rounded-xl border border-zinc-800 bg-zinc-900/50 p-4",children:[(0,t.jsxs)("div",{className:"flex items-center justify-between",children:[(0,t.jsx)("p",{className:"text-xs font-medium uppercase tracking-wide text-zinc-500",children:"Versé (historique)"}),(0,t.jsx)(o.CircleDollarSign,{className:"h-4 w-4 text-zinc-400"})]}),(0,t.jsxs)("p",{className:"mt-1 text-2xl font-bold text-zinc-200",children:[N(v)," TND"]})]})]}),(d?.venues??[]).length>0&&(0,t.jsxs)("div",{className:"rounded-xl border border-zinc-800 bg-zinc-900/50 p-4",children:[(0,t.jsx)("p",{className:"mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500",children:"Solde par établissement"}),(0,t.jsx)("div",{className:"space-y-2",children:d.venues.map(e=>(0,t.jsxs)("div",{className:"flex items-center justify-between rounded-lg bg-zinc-800/60 px-3 py-2",children:[(0,t.jsxs)("div",{className:"flex items-center gap-2",children:[(0,t.jsx)(l.Building2,{className:"h-4 w-4 text-zinc-500"}),(0,t.jsx)("span",{className:"text-sm text-zinc-200",children:e.venueName}),(0,t.jsxs)("span",{className:"rounded bg-zinc-700 px-1.5 py-0.5 text-xs text-zinc-400",children:[e.reservationCount," rés."]})]}),(0,t.jsxs)("div",{className:"text-right",children:[(0,t.jsxs)("span",{className:"text-sm font-semibold text-emerald-400",children:[N(e.net)," TND"]}),(0,t.jsx)("span",{className:"ml-2 text-xs text-zinc-500",children:"net"})]})]},e._id))})]}),(0,t.jsx)("div",{className:"flex flex-wrap gap-2",children:$.map(a=>(0,t.jsx)("button",{onClick:()=>i(a.key),className:(0,f.cn)("rounded-full border px-3 py-1 text-xs font-medium transition",e===a.key?"border-amber-400 bg-amber-400/10 text-amber-300":"border-zinc-700 bg-zinc-800/50 text-zinc-400 hover:border-zinc-600"),children:a.label},a.key))}),b?(0,t.jsx)("div",{className:"flex justify-center py-12",children:(0,t.jsx)(p.Loader2,{className:"h-6 w-6 animate-spin text-zinc-500"})}):0===g.length?(0,t.jsxs)("div",{className:"rounded-xl border border-dashed border-zinc-700 py-16 text-center",children:[(0,t.jsx)(x.Receipt,{className:"mx-auto mb-3 h-8 w-8 text-zinc-600"}),(0,t.jsx)("p",{className:"text-sm text-zinc-500",children:"Aucun virement pour cette période."})]}):(0,t.jsx)("div",{className:"space-y-3",children:g.map(e=>(0,t.jsx)(z,{payout:e,onClick:()=>r(e)},e._id))}),n&&(0,t.jsx)(k,{payout:n,onClose:()=>r(null)})]})}e.s(["default",()=>P])}]);