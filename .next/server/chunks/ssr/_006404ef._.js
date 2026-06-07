module.exports=[96221,a=>{"use strict";let b=(0,a.i(70106).default)("loader-circle",[["path",{d:"M21 12a9 9 0 1 1-6.219-8.56",key:"13zald"}]]);a.s(["Loader2",()=>b],96221)},92e3,a=>{"use strict";let b=(0,a.i(70106).default)("circle-alert",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["line",{x1:"12",x2:"12",y1:"8",y2:"12",key:"1pkeuh"}],["line",{x1:"12",x2:"12.01",y1:"16",y2:"16",key:"4dfq90"}]]);a.s(["AlertCircle",()=>b],92e3)},62722,a=>{"use strict";let b=(0,a.i(70106).default)("circle-x",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"m15 9-6 6",key:"1uzhvr"}],["path",{d:"m9 9 6 6",key:"z0biqf"}]]);a.s(["XCircle",()=>b],62722)},35830,a=>{"use strict";let b=(0,a.i(70106).default)("circle-dollar-sign",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8",key:"1h4pet"}],["path",{d:"M12 18V6",key:"zqpxq5"}]]);a.s(["CircleDollarSign",()=>b],35830)},24669,a=>{"use strict";let b=(0,a.i(70106).default)("trending-up",[["path",{d:"M16 7h6v6",key:"box55l"}],["path",{d:"m22 7-8.5 8.5-5-5L2 17",key:"1t1m79"}]]);a.s(["TrendingUp",()=>b],24669)},62219,a=>{"use strict";let b=(0,a.i(70106).default)("badge-check",[["path",{d:"M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z",key:"3c2336"}],["path",{d:"m9 12 2 2 4-4",key:"dzmm74"}]]);a.s(["BadgeCheck",()=>b],62219)},84505,a=>{"use strict";let b=(0,a.i(70106).default)("download",[["path",{d:"M12 15V3",key:"m9g1x1"}],["path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4",key:"ih7n3h"}],["path",{d:"m7 10 5 5 5-5",key:"brsn70"}]]);a.s(["Download",()=>b],84505)},1199,a=>{"use strict";let b=(0,a.i(70106).default)("receipt",[["path",{d:"M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z",key:"q3az6g"}],["path",{d:"M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8",key:"1h4pet"}],["path",{d:"M12 17.5v-11",key:"1jc1ny"}]]);a.s(["Receipt",()=>b],1199)},7525,79153,2545,a=>{"use strict";let b=(0,a.i(70106).default)("banknote",[["rect",{width:"20",height:"12",x:"2",y:"6",rx:"2",key:"9lu3g6"}],["circle",{cx:"12",cy:"12",r:"2",key:"1c9p78"}],["path",{d:"M6 12h.01M18 12h.01",key:"113zkx"}]]);function c(a){return new Intl.NumberFormat("fr-TN",{minimumFractionDigits:3}).format(a)}function d(a){return new Date(a).toLocaleDateString("fr-TN",{day:"2-digit",month:"long",year:"numeric"})}function e(a,b){let e="object"==typeof a.venueId?a.venueId:null,f="object"==typeof a.ownerId?a.ownerId:null,g=b??f?.name??"—",h=e?.name??"—",i=a.items.map((a,b)=>`
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
</html>`,k=window.open("","_blank","width=900,height=700");k&&(k.document.write(j),k.document.close())}a.s(["BanknoteIcon",()=>b],7525),a.s(["printPayout",()=>e],79153);var f=a.i(62477);async function g(){return(await (0,f.apiFetch)("/payouts/owner/balance")).data}async function h(a){let b=new URLSearchParams;a?.page&&b.set("page",String(a.page)),a?.limit&&b.set("limit",String(a.limit)),a?.status&&b.set("status",a.status);let c=await (0,f.apiFetch)(`/payouts/owner?${b}`);return{data:c.data??[],meta:c.meta??{total:0,page:1,pages:1}}}async function i(a){let b=new URLSearchParams;a?.page&&b.set("page",String(a.page)),a?.status&&b.set("status",a.status),a?.venueId&&b.set("venueId",a.venueId),a?.ownerId&&b.set("ownerId",a.ownerId);let c=await (0,f.apiFetch)(`/payouts/admin?${b}`);return{data:c.data??[],meta:c.meta??{total:0,page:1,pages:1}}}async function j(a){return(await (0,f.apiPostRaw)("/payouts/admin/generate",a)).data}async function k(a,b){return(await (0,f.apiPatchRaw)(`/payouts/admin/${a}/approve`,{notes:b})).data}async function l(a,b){return(await (0,f.apiPatchRaw)(`/payouts/admin/${a}/mark-paid`,b??{})).data}async function m(a,b){return(await (0,f.apiPatchRaw)(`/payouts/admin/${a}/hold`,{reason:b})).data}async function n(a,b){return(await (0,f.apiPatchRaw)(`/payouts/admin/${a}/reject`,{reason:b})).data}a.s(["adminApprovePayout",()=>k,"adminGeneratePayout",()=>j,"adminHoldPayout",()=>m,"adminMarkPayoutPaid",()=>l,"adminRejectPayout",()=>n,"fetchAdminPayouts",()=>i,"fetchOwnerBalance",()=>g,"fetchOwnerPayouts",()=>h],2545)},31405,a=>{"use strict";var b=a.i(87924),c=a.i(72131),d=a.i(33217),e=a.i(92e3),f=a.i(62219),g=a.i(7525),h=a.i(67900),i=a.i(50522),j=a.i(35830),k=a.i(41710),l=a.i(84505),m=a.i(96221),n=a.i(1199),o=a.i(24669),p=a.i(56738),q=a.i(62722),r=a.i(79153),s=a.i(97895),t=a.i(2545);let u={pending:{label:"En attente",color:"text-amber-400 bg-amber-400/10 border-amber-400/20",icon:k.Clock},approved:{label:"Approuvé",color:"text-blue-400 bg-blue-400/10 border-blue-400/20",icon:f.BadgeCheck},paid:{label:"Payé",color:"text-emerald-400 bg-emerald-400/10 border-emerald-400/20",icon:g.BanknoteIcon},on_hold:{label:"Suspendu",color:"text-orange-400 bg-orange-400/10 border-orange-400/20",icon:e.AlertCircle},rejected:{label:"Rejeté",color:"text-red-400 bg-red-400/10 border-red-400/20",icon:q.XCircle}};function v({status:a}){let c=u[a]??u.pending,d=c.icon;return(0,b.jsxs)("span",{className:(0,s.cn)("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",c.color),children:[(0,b.jsx)(d,{className:"h-3 w-3"}),c.label]})}function w(a){return new Intl.NumberFormat("fr-TN",{minimumFractionDigits:0}).format(Math.round(a))}function x(a){return new Date(a).toLocaleDateString("fr-TN",{day:"2-digit",month:"short",year:"numeric"})}function y({payout:a,onClick:c}){let d="object"==typeof a.venueId?a.venueId:null;return(0,b.jsxs)("button",{onClick:c,className:"group flex w-full items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 text-left transition hover:border-zinc-700 hover:bg-zinc-900",children:[(0,b.jsx)("div",{className:"flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-amber-400/10 text-amber-400",children:(0,b.jsx)(n.Receipt,{className:"h-5 w-5"})}),(0,b.jsxs)("div",{className:"min-w-0 flex-1",children:[(0,b.jsx)("p",{className:"truncate text-sm font-medium text-zinc-100",children:d?.name??"Établissement"}),(0,b.jsxs)("p",{className:"mt-0.5 text-xs text-zinc-500",children:[x(a.periodStart)," → ",x(a.periodEnd)," · ",a.items.length," rés."]})]}),(0,b.jsxs)("div",{className:"text-right",children:[(0,b.jsxs)("p",{className:"text-sm font-semibold text-emerald-400",children:[w(a.net)," TND"]}),(0,b.jsx)("p",{className:"mt-0.5 text-xs text-zinc-500",children:"net"})]}),(0,b.jsx)(v,{status:a.status}),(0,b.jsx)(i.ChevronRight,{className:"h-4 w-4 flex-shrink-0 text-zinc-600 transition group-hover:text-zinc-400"})]})}function z({payout:a,onClose:c}){let d="object"==typeof a.venueId?a.venueId:null;return(0,b.jsx)("div",{className:"fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center",onClick:c,children:(0,b.jsxs)("div",{className:"w-full max-w-lg rounded-t-2xl border border-zinc-800 bg-zinc-950 p-6 sm:rounded-2xl",onClick:a=>a.stopPropagation(),children:[(0,b.jsxs)("div",{className:"mb-5 flex items-start justify-between",children:[(0,b.jsxs)("div",{children:[(0,b.jsx)("h2",{className:"text-lg font-semibold text-zinc-100",children:d?.name??"Virement"}),(0,b.jsxs)("p",{className:"mt-0.5 text-sm text-zinc-500",children:[x(a.periodStart)," → ",x(a.periodEnd)]})]}),(0,b.jsx)(v,{status:a.status})]}),(0,b.jsx)("div",{className:"mb-5 grid grid-cols-3 gap-3",children:[{label:"Brut",value:a.gross,color:"text-zinc-100"},{label:"Commission",value:a.commission,color:"text-red-400"},{label:"Net",value:a.net,color:"text-emerald-400"}].map(({label:a,value:c,color:d})=>(0,b.jsxs)("div",{className:"rounded-lg border border-zinc-800 bg-zinc-900 p-3 text-center",children:[(0,b.jsx)("p",{className:(0,s.cn)("text-base font-bold",d),children:w(c)}),(0,b.jsxs)("p",{className:"text-xs text-zinc-500",children:[a," TND"]})]},a))}),(0,b.jsxs)("p",{className:"mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500",children:["Réservations incluses (",a.items.length,")"]}),(0,b.jsx)("div",{className:"max-h-52 space-y-1.5 overflow-y-auto pr-1",children:a.items.map((a,c)=>(0,b.jsxs)("div",{className:"flex items-center justify-between rounded-lg bg-zinc-900 px-3 py-2 text-xs",children:[(0,b.jsxs)("div",{children:[(0,b.jsx)("span",{className:"font-mono font-medium text-zinc-200",children:a.reservationCode??"—"}),(0,b.jsxs)("span",{className:"ml-2 text-zinc-500",children:[x(a.startAt)," → ",x(a.endAt)]})]}),(0,b.jsxs)("span",{className:"font-medium text-emerald-400",children:[w(a.net)," TND"]})]},c))}),"paid"===a.status&&a.paidAt&&(0,b.jsxs)("p",{className:"mt-4 text-xs text-zinc-500",children:["Payé le ",x(a.paidAt),a.paymentReference&&(0,b.jsxs)("span",{className:"ml-1",children:["· Réf: ",a.paymentReference]})]}),a.statusReason&&(0,b.jsx)("p",{className:"mt-3 rounded-lg border border-orange-500/20 bg-orange-500/10 px-3 py-2 text-xs text-orange-300",children:a.statusReason}),(0,b.jsxs)("div",{className:"mt-5 flex gap-2",children:[(0,b.jsxs)("button",{onClick:()=>(0,r.printPayout)(a),className:"flex flex-1 items-center justify-center gap-2 rounded-lg border border-amber-500/40 bg-amber-400/10 py-2.5 text-sm font-medium text-amber-300 hover:bg-amber-400/20",children:[(0,b.jsx)(l.Download,{className:"h-4 w-4"}),"Télécharger"]}),(0,b.jsx)("button",{onClick:c,className:"flex-1 rounded-lg border border-zinc-700 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800",children:"Fermer"})]})]})})}let A=[{key:"",label:"Tous"},{key:"pending",label:"En attente"},{key:"approved",label:"Approuvés"},{key:"paid",label:"Payés"},{key:"on_hold",label:"Suspendus"}];function B(){let[a,e]=(0,c.useState)(""),[f,g]=(0,c.useState)(null),{data:i,isLoading:k}=(0,d.useQuery)({queryKey:["owner-balance"],queryFn:t.fetchOwnerBalance}),{data:l,isLoading:q}=(0,d.useQuery)({queryKey:["owner-payouts",a],queryFn:()=>(0,t.fetchOwnerPayouts)({status:a||void 0})}),r=l?.data??[],u=r.filter(a=>"paid"===a.status).reduce((a,b)=>a+b.net,0),v=r.filter(a=>["pending","approved"].includes(a.status)).reduce((a,b)=>a+b.net,0);return(0,b.jsxs)("div",{className:"mx-auto max-w-3xl space-y-6 px-4 py-8",children:[(0,b.jsxs)("div",{children:[(0,b.jsx)("h1",{className:"text-2xl font-bold text-zinc-100",children:"Mes virements"}),(0,b.jsx)("p",{className:"mt-1 text-sm text-zinc-400",children:"Suivez vos commissions nettes et l'historique de vos paiements."})]}),(0,b.jsxs)("div",{className:"grid grid-cols-1 gap-4 sm:grid-cols-3",children:[(0,b.jsxs)("div",{className:"rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4",children:[(0,b.jsxs)("div",{className:"flex items-center justify-between",children:[(0,b.jsx)("p",{className:"text-xs font-medium uppercase tracking-wide text-zinc-500",children:"Solde non versé"}),(0,b.jsx)(p.Wallet,{className:"h-4 w-4 text-emerald-400"})]}),k?(0,b.jsx)(m.Loader2,{className:"mt-2 h-5 w-5 animate-spin text-zinc-500"}):(0,b.jsxs)("p",{className:"mt-1 text-2xl font-bold text-emerald-400",children:[w(i?.totalUnpaid??0)," TND"]})]}),(0,b.jsxs)("div",{className:"rounded-xl border border-zinc-800 bg-zinc-900/50 p-4",children:[(0,b.jsxs)("div",{className:"flex items-center justify-between",children:[(0,b.jsx)("p",{className:"text-xs font-medium uppercase tracking-wide text-zinc-500",children:"En cours"}),(0,b.jsx)(o.TrendingUp,{className:"h-4 w-4 text-amber-400"})]}),(0,b.jsxs)("p",{className:"mt-1 text-2xl font-bold text-amber-400",children:[w(v)," TND"]})]}),(0,b.jsxs)("div",{className:"rounded-xl border border-zinc-800 bg-zinc-900/50 p-4",children:[(0,b.jsxs)("div",{className:"flex items-center justify-between",children:[(0,b.jsx)("p",{className:"text-xs font-medium uppercase tracking-wide text-zinc-500",children:"Versé (historique)"}),(0,b.jsx)(j.CircleDollarSign,{className:"h-4 w-4 text-zinc-400"})]}),(0,b.jsxs)("p",{className:"mt-1 text-2xl font-bold text-zinc-200",children:[w(u)," TND"]})]})]}),(i?.venues??[]).length>0&&(0,b.jsxs)("div",{className:"rounded-xl border border-zinc-800 bg-zinc-900/50 p-4",children:[(0,b.jsx)("p",{className:"mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500",children:"Solde par établissement"}),(0,b.jsx)("div",{className:"space-y-2",children:i.venues.map(a=>(0,b.jsxs)("div",{className:"flex items-center justify-between rounded-lg bg-zinc-800/60 px-3 py-2",children:[(0,b.jsxs)("div",{className:"flex items-center gap-2",children:[(0,b.jsx)(h.Building2,{className:"h-4 w-4 text-zinc-500"}),(0,b.jsx)("span",{className:"text-sm text-zinc-200",children:a.venueName}),(0,b.jsxs)("span",{className:"rounded bg-zinc-700 px-1.5 py-0.5 text-xs text-zinc-400",children:[a.reservationCount," rés."]})]}),(0,b.jsxs)("div",{className:"text-right",children:[(0,b.jsxs)("span",{className:"text-sm font-semibold text-emerald-400",children:[w(a.net)," TND"]}),(0,b.jsx)("span",{className:"ml-2 text-xs text-zinc-500",children:"net"})]})]},a._id))})]}),(0,b.jsx)("div",{className:"flex flex-wrap gap-2",children:A.map(c=>(0,b.jsx)("button",{onClick:()=>e(c.key),className:(0,s.cn)("rounded-full border px-3 py-1 text-xs font-medium transition",a===c.key?"border-amber-400 bg-amber-400/10 text-amber-300":"border-zinc-700 bg-zinc-800/50 text-zinc-400 hover:border-zinc-600"),children:c.label},c.key))}),q?(0,b.jsx)("div",{className:"flex justify-center py-12",children:(0,b.jsx)(m.Loader2,{className:"h-6 w-6 animate-spin text-zinc-500"})}):0===r.length?(0,b.jsxs)("div",{className:"rounded-xl border border-dashed border-zinc-700 py-16 text-center",children:[(0,b.jsx)(n.Receipt,{className:"mx-auto mb-3 h-8 w-8 text-zinc-600"}),(0,b.jsx)("p",{className:"text-sm text-zinc-500",children:"Aucun virement pour cette période."})]}):(0,b.jsx)("div",{className:"space-y-3",children:r.map(a=>(0,b.jsx)(y,{payout:a,onClick:()=>g(a)},a._id))}),f&&(0,b.jsx)(z,{payout:f,onClose:()=>g(null)})]})}a.s(["default",()=>B])}];

//# sourceMappingURL=_006404ef._.js.map