
import React, { useMemo, useState, useEffect } from 'react'

type StaffingItem = {
  id: string
  role: string
  qty: number
  billableHourly: string
  onsiteHoursPerDay: number
  onsiteDays: number
  includeTravelTime: boolean
  travelHours: number
  travelHourly: string
  overtimeHoursPerDay: number
  overtimeMultiplier: string
  weekendDays: number
  weekendMultiplier: string
}

type Leg = { id: string; from: string; to: string; purpose?: string; airfare: string }

type Scenario = {
  meta: { title: string; notes: string }
  staffing: StaffingItem[]
  routing: { origin: string; intermediate?: string; destination: string; legs: Leg[] }
  visasSecurity: { visaCost: string; workPermitCost: string; securityCost: string }
  insurance: { travelPolicy: string; healthPerDay: string; extraFixed: string }
  localTransport: {
    trainCost: string
    useCar: boolean
    carDays: number
    carDailyRate: string
    distanceKm: string
    fuelPricePerL: string
    consumptionLPer100: string
    tolls: string
    parking: string
    carExtraFees: string
  }
  allowances: { hotelPerNight: string; mealsPerDay: string; laundryPerWeek: string; incidentalsPerDay: string }
  taxes: { localTaxPct: string; withholdingFixed: string; applyTaxToLaborOnly: boolean }
  contingencyPct: string
  currency: { base: string; showTarget: boolean; target: string; rateBaseToTarget: string }
}

const CCY = ['USD','EUR','GBP','BRL','MXN','INR','CNY','JPY','KRW','AED','SAR','TRY','CAD','AUD','ZAR']
const num = (n:any)=> isFinite(Number(n))? Number(n):0
const fmt = (n:number, ccy:string)=> new Intl.NumberFormat(undefined,{style:'currency',currency:ccy,maximumFractionDigits:2}).format(n||0)

const defaultStaff: StaffingItem = {
  id: crypto.randomUUID(),
  role: 'Senior Field Engineer',
  qty: 1,
  billableHourly: '120',
  onsiteHoursPerDay: 8,
  onsiteDays: 10,
  includeTravelTime: true,
  travelHours: 20,
  travelHourly: '120',
  overtimeHoursPerDay: 0,
  overtimeMultiplier: '1.5',
  weekendDays: 0,
  weekendMultiplier: '2.0',
}

const initial: Scenario = {
  meta: { title: 'Mobilization — GitHub Pages (EN)', notes: 'Build ready to publish via Actions' },
  staffing: [defaultStaff],
  routing: {
    origin: 'São Paulo, BR',
    intermediate: 'Doha, QA',
    destination: 'Seoul, KR',
    legs: [
      { id: crypto.randomUUID(), from: 'GRU', to: 'DOH', purpose: 'Conn', airfare: '900' },
      { id: crypto.randomUUID(), from: 'DOH', to: 'ICN', purpose: 'Final', airfare: '700' },
    ],
  },
  visasSecurity: { visaCost: '120', workPermitCost: '0', securityCost: '0' },
  insurance: { travelPolicy: '85', healthPerDay: '6', extraFixed: '0' },
  localTransport: {
    trainCost: '60', useCar: false, carDays: 0, carDailyRate: '45',
    distanceKm: '0', fuelPricePerL: '1.8', consumptionLPer100: '7.5',
    tolls: '0', parking: '0', carExtraFees: '0'
  },
  allowances: { hotelPerNight: '140', mealsPerDay: '65', laundryPerWeek: '25', incidentalsPerDay: '12' },
  taxes: { localTaxPct: '0', withholdingFixed: '0', applyTaxToLaborOnly: false },
  contingencyPct: '7.5',
  currency: { base: 'USD', showTarget: false, target: 'EUR', rateBaseToTarget: '0.92' }
}

function Card({title, children, right}:{title:string, children:React.ReactNode, right?:React.ReactNode}){
  return (
    <div className="card">
      <h2>{title} {right && <span className="pill">{right}</span>}</h2>
      {children}
    </div>
  )
}

export default function App(){
  const [tab, setTab] = useState<'inputs'|'summary'>('inputs')
  const [sc, setSc] = useState<Scenario>(() => initial)

  useEffect(()=>{ localStorage.setItem('mobilization_pages', JSON.stringify(sc)) },[sc])

  // Travel & VSI
  const airfareTotal = useMemo(()=> sc.routing.legs.reduce((s,l)=> s + num(l.airfare), 0), [sc.routing.legs])
  const visaTotal = useMemo(()=> num(sc.visasSecurity.visaCost) + num(sc.visasSecurity.workPermitCost), [sc.visasSecurity])
  const securityTotal = useMemo(()=> num(sc.visasSecurity.securityCost), [sc.visasSecurity.securityCost])
  const maxDays = useMemo(()=> sc.staffing.reduce((m,s)=> Math.max(m, s.onsiteDays), 0), [sc.staffing])
  const insuranceTotal = useMemo(()=> num(sc.insurance.travelPolicy) + num(sc.insurance.extraFixed) + num(sc.insurance.healthPerDay)*maxDays, [sc.insurance, maxDays])
  const vsiTotal = visaTotal + securityTotal + insuranceTotal

  // Local transport
  const carFuelCost = useMemo(()=> num(sc.localTransport.distanceKm)*(num(sc.localTransport.consumptionLPer100)/100)*num(sc.localTransport.fuelPricePerL), [sc.localTransport])
  const carRental = useMemo(()=> sc.localTransport.useCar ? sc.localTransport.carDays * num(sc.localTransport.carDailyRate) : 0, [sc.localTransport])
  const localTransportTotal = useMemo(()=> num(sc.localTransport.trainCost) + (sc.localTransport.useCar ? (carRental + carFuelCost + num(sc.localTransport.tolls) + num(sc.localTransport.parking) + num(sc.localTransport.carExtraFees)) : 0), [sc.localTransport, carFuelCost, carRental])

  // Allowances
  const hotelTotal = useMemo(()=> num(sc.allowances.hotelPerNight) * maxDays, [sc.allowances.hotelPerNight, maxDays])
  const mealsTotal = useMemo(()=> num(sc.allowances.mealsPerDay) * maxDays, [sc.allowances.mealsPerDay, maxDays])
  const laundryTotal = useMemo(()=> Math.ceil(maxDays/7) * num(sc.allowances.laundryPerWeek), [sc.allowances.laundryPerWeek, maxDays])
  const incTotal = useMemo(()=> num(sc.allowances.incidentalsPerDay) * maxDays, [sc.allowances.incidentalsPerDay, maxDays])
  const perDiemTotal = hotelTotal + mealsTotal + laundryTotal + incTotal

  // Staffing (multi-role)
  const laborBreakdown = useMemo(()=> sc.staffing.map(st=>{
    const baseH = st.onsiteDays * st.onsiteHoursPerDay
    const basePerHead = baseH * num(st.billableHourly)
    const otH = st.onsiteDays * st.overtimeHoursPerDay
    const otPerHead = otH * num(st.billableHourly) * num(st.overtimeMultiplier)
    const wkH = st.weekendDays * st.onsiteHoursPerDay
    const wkPremPerHead = wkH * num(st.billableHourly) * Math.max(num(st.weekendMultiplier) - 1, 0)
    const travelPerHead = st.includeTravelTime ? (num(st.travelHourly) * num(st.travelHours)) : 0
    const perHead = basePerHead + otPerHead + wkPremPerHead + travelPerHead
    const total = perHead * st.qty
    return { id: st.id, role: st.role, qty: st.qty, total }
  }), [sc.staffing])
  const laborTotal = laborBreakdown.reduce((s,r)=> s + r.total, 0)

  // Totals & taxes
  const travelFixedTotal = airfareTotal + vsiTotal + localTransportTotal
  const taxableBase = sc.taxes.applyTaxToLaborOnly ? laborTotal : (laborTotal + perDiemTotal + travelFixedTotal)
  const taxesTotal = taxableBase * (num(sc.taxes.localTaxPct)/100) + num(sc.taxes.withholdingFixed)
  const subtotal = laborTotal + perDiemTotal + travelFixedTotal + taxesTotal
  const contingencyTotal = subtotal * (num(sc.contingencyPct)/100)
  const grandTotalBase = subtotal + contingencyTotal
  const converted = useMemo(()=> sc.currency.showTarget ? grandTotalBase * (num(sc.currency.rateBaseToTarget)||0) : null, [sc.currency.showTarget, sc.currency.rateBaseToTarget, grandTotalBase])

  const addLeg = ()=> setSc(s=> ({...s, routing: {...s.routing, legs: [...s.routing.legs, { id: crypto.randomUUID(), from: '', to: '', purpose: '', airfare: '0'}] }}))
  const rmLeg = (id:string)=> setSc(s=> ({...s, routing: {...s.routing, legs: s.routing.legs.filter(l=> l.id!==id)} }))
  const addRole = ()=> setSc(s=> ({...s, staffing: [...s.staffing, { ...defaultStaff, id: crypto.randomUUID(), role: 'Engineer'}]}))
  const rmRole = (id:string)=> setSc(s=> ({...s, staffing: s.staffing.filter(x=> x.id!==id)}))

  return (
    <div className="wrap">
      <h1>Engineer Mobilization Calculator</h1>
      <p className="sub">Ready for GitHub Pages (Vite + React).</p>

      <div className="tabs">
        <button className={'tab ' + (tab==='inputs'?'active':'')} onClick={()=>setTab('inputs')}>Inputs</button>
        <button className={'tab ' + (tab==='summary'?'active':'')} onClick={()=>setTab('summary')}>Summary</button>
      </div>

      {tab==='inputs' && (
        <div className="grid g2">
          <Card title="General">
            <div className="grid g2">
              <div>
                <label>Activity / Task</label>
                <input value={sc.meta.title} onChange={e=> setSc({...sc, meta:{...sc.meta, title: e.target.value}})} />
              </div>
              <div>
                <label>Notes</label>
                <textarea value={sc.meta.notes} onChange={e=> setSc({...sc, meta:{...sc.meta, notes: e.target.value}})} />
              </div>
            </div>
          </Card>

          <Card title="Staffing (multiple roles)" right={<button className="btn" onClick={addRole}>Add role</button>}>
            <div className="grid" style={{gap:12}}>
              {sc.staffing.map((st,i)=>(
                <div key={st.id} className="role">
                  <div className="row" style={{justifyContent:'space-between'}}>
                    <div><strong>Role #{i+1}</strong></div>
                    <button className="btn" onClick={()=>rmRole(st.id)}>Remove</button>
                  </div>
                  <div className="grid g3" style={{marginTop:8}}>
                    <div><label>Role</label><input value={st.role} onChange={e=> setSc(s=>({...s, staffing: s.staffing.map(x=> x.id===st.id? {...x, role:e.target.value}:x)}))} /></div>
                    <div><label>Qty</label><input type="number" min={1} value={st.qty} onChange={e=> setSc(s=>({...s, staffing: s.staffing.map(x=> x.id===st.id? {...x, qty:Number(e.target.value)||1}:x)}))} /></div>
                    <div><label>Hourly (base)</label><input value={st.billableHourly} onChange={e=> setSc(s=>({...s, staffing: s.staffing.map(x=> x.id===st.id? {...x, billableHourly:e.target.value}:x)}))} /></div>
                    <div><label>Hours/day</label><input type="number" value={st.onsiteHoursPerDay} onChange={e=> setSc(s=>({...s, staffing: s.staffing.map(x=> x.id===st.id? {...x, onsiteHoursPerDay:Number(e.target.value)||0}:x)}))} /></div>
                    <div><label>On-site days</label><input type="number" value={st.onsiteDays} onChange={e=> setSc(s=>({...s, staffing: s.staffing.map(x=> x.id===st.id? {...x, onsiteDays:Number(e.target.value)||0}:x)}))} /></div>
                    <div className="row" style={{gap:8,alignItems:'center'}}>
                      <input type="checkbox" checked={st.includeTravelTime} onChange={e=> setSc(s=>({...s, staffing: s.staffing.map(x=> x.id===st.id? {...x, includeTravelTime:e.target.checked}:x)}))} />
                      <span className="muted">Bill travel time</span>
                    </div>
                    <div><label>Travel hours (total)</label><input type="number" value={st.travelHours} onChange={e=> setSc(s=>({...s, staffing: s.staffing.map(x=> x.id===st.id? {...x, travelHours:Number(e.target.value)||0}:x)}))} /></div>
                    <div><label>Travel hourly rate</label><input value={st.travelHourly} onChange={e=> setSc(s=>({...s, staffing: s.staffing.map(x=> x.id===st.id? {...x, travelHourly:e.target.value}:x)}))} /></div>
                    <div><label>Overtime hours/day</label><input type="number" value={st.overtimeHoursPerDay} onChange={e=> setSc(s=>({...s, staffing: s.staffing.map(x=> x.id===st.id? {...x, overtimeHoursPerDay:Number(e.target.value)||0}:x)}))} /></div>
                    <div><label>Overtime multiplier</label><input value={st.overtimeMultiplier} onChange={e=> setSc(s=>({...s, staffing: s.staffing.map(x=> x.id===st.id? {...x, overtimeMultiplier:e.target.value}:x)}))} /></div>
                    <div><label>Weekend days</label><input type="number" value={st.weekendDays} onChange={e=> setSc(s=>({...s, staffing: s.staffing.map(x=> x.id===st.id? {...x, weekendDays:Number(e.target.value)||0}:x)}))} /></div>
                    <div><label>Weekend multiplier</label><input value={st.weekendMultiplier} onChange={e=> setSc(s=>({...s, staffing: s.staffing.map(x=> x.id===st.id? {...x, weekendMultiplier:e.target.value}:x)}))} /></div>
                  </div>
                </div>
              ))}
            </div>
            <div className="muted" style={{marginTop:8}}>Staffing total: <span className="total">{fmt(laborTotal, sc.currency.base)}</span></div>
          </Card>

          <Card title="Routing & Airfare" right={<button className="btn" onClick={addLeg}>Add leg</button>}>
            <div className="grid g3">
              <div><label>Origin</label><input value={sc.routing.origin} onChange={e=> setSc({...sc, routing:{...sc.routing, origin:e.target.value}})} /></div>
              <div><label>Intermediate</label><input value={sc.routing.intermediate||''} onChange={e=> setSc({...sc, routing:{...sc.routing, intermediate:e.target.value}})} /></div>
              <div><label>Fromstination</label><input value={sc.routing.destination} onChange={e=> setSc({...sc, routing:{...sc.routing, destination:e.target.value}})} /></div>
            </div>
            <div className="grid" style={{gap:8, marginTop:8}}>
              {sc.routing.legs.map(leg=> (
                <div key={leg.id} className="grid g3" style={{border:'1px dashed var(--border)',borderRadius:12,padding:10}}>
                  <div><label>From</label><input value={leg.from} onChange={e=> setSc(s=> ({...s, routing:{...s.routing, legs: s.routing.legs.map(l=> l.id===leg.id? {...l, from:e.target.value}:l)}}))} /></div>
                  <div><label>To</label><input value={leg.to} onChange={e=> setSc(s=> ({...s, routing:{...s.routing, legs: s.routing.legs.map(l=> l.id===leg.id? {...l, to:e.target.value}:l)}}))} /></div>
                  <div><label>Purpose</label><input value={leg.purpose||''} onChange={e=> setSc(s=> ({...s, routing:{...s.routing, legs: s.routing.legs.map(l=> l.id===leg.id? {...l, purpose:e.target.value}:l)}}))} /></div>
                  <div><label>Airfare</label><input value={leg.airfare} onChange={e=> setSc(s=> ({...s, routing:{...s.routing, legs: s.routing.legs.map(l=> l.id===leg.id? {...l, airfare:e.target.value}:l)}}))} /></div>
                  <div className="row" style={{justifyContent:'flex-end',alignItems:'end'}}><button className="btn" onClick={()=> rmLeg(leg.id)}>Remove</button></div>
                </div>
              ))}
            </div>
            <div className="muted">Airfare total: <span className="total">{fmt(airfareTotal, sc.currency.base)}</span></div>
          </Card>

          <Card title="Visas, Security & Insurance">
            <div className="grid g3">
              <div><label>Visa</label><input value={sc.visasSecurity.visaCost} onChange={e=> setSc({...sc, visasSecurity:{...sc.visasSecurity, visaCost:e.target.value}})} /></div>
              <div><label>Work permit</label><input value={sc.visasSecurity.workPermitCost} onChange={e=> setSc({...sc, visasSecurity:{...sc.visasSecurity, workPermitCost:e.target.value}})} /></div>
              <div><label>Security</label><input value={sc.visasSecurity.securityCost} onChange={e=> setSc({...sc, visasSecurity:{...sc.visasSecurity, securityCost:e.target.value}})} /></div>
            </div>
            <div className="grid g3">
              <div><label>Travel policy (fixed)</label><input value={sc.insurance.travelPolicy} onChange={e=> setSc({...sc, insurance:{...sc.insurance, travelPolicy:e.target.value}})} /></div>
              <div><label>Health/day</label><input value={sc.insurance.healthPerDay} onChange={e=> setSc({...sc, insurance:{...sc.insurance, healthPerDay:e.target.value}})} /></div>
              <div><label>Extra (fixed)</label><input value={sc.insurance.extraFixed} onChange={e=> setSc({...sc, insurance:{...sc.insurance, extraFixed:e.target.value}})} /></div>
            </div>
            <div className="muted">Total Visas/Security/Seguros: <span className="total">{fmt(vsiTotal, sc.currency.base)}</span></div>
          </Card>

          <Card title="Local transportation">
            <div className="grid g2">
              <div><label>Train/Metro/Bus</label><input value={sc.localTransport.trainCost} onChange={e=> setSc({...sc, localTransport:{...sc.localTransport, trainCost:e.target.value}})} /></div>
              <div className="row"><input type="checkbox" checked={sc.localTransport.useCar} onChange={e=> setSc({...sc, localTransport:{...sc.localTransport, useCar:e.target.checked}})} /><span className="muted">Use rental car</span></div>
            </div>
            {sc.localTransport.useCar && (
              <div className="grid g3">
                <div><label>Car days</label><input type="number" value={sc.localTransport.carDays} onChange={e=> setSc({...sc, localTransport:{...sc.localTransport, carDays:Number(e.target.value)||0}})} /></div>
                <div><label>Daily rate</label><input value={sc.localTransport.carDailyRate} onChange={e=> setSc({...sc, localTransport:{...sc.localTransport, carDailyRate:e.target.value}})} /></div>
                <div><label>Distance (km)</label><input value={sc.localTransport.distanceKm} onChange={e=> setSc({...sc, localTransport:{...sc.localTransport, distanceKm:e.target.value}})} /></div>
                <div><label>Fuel (per L)</label><input value={sc.localTransport.fuelPricePerL} onChange={e=> setSc({...sc, localTransport:{...sc.localTransport, fuelPricePerL:e.target.value}})} /></div>
                <div><label>Consumption (L/100km)</label><input value={sc.localTransport.consumptionLPer100} onChange={e=> setSc({...sc, localTransport:{...sc.localTransport, consumptionLPer100:e.target.value}})} /></div>
                <div><label>Tolls</label><input value={sc.localTransport.tolls} onChange={e=> setSc({...sc, localTransport:{...sc.localTransport, tolls:e.target.value}})} /></div>
                <div><label>Parking</label><input value={sc.localTransport.parking} onChange={e=> setSc({...sc, localTransport:{...sc.localTransport, parking:e.target.value}})} /></div>
                <div><label>Extra car fees</label><input value={sc.localTransport.carExtraFees} onChange={e=> setSc({...sc, localTransport:{...sc.localTransport, carExtraFees:e.target.value}})} /></div>
              </div>
            )}
            <div className="muted">Local transport total: <span className="total">{fmt(localTransportTotal, sc.currency.base)}</span></div>
          </Card>

          <Card title="Daily rates (Per-diem)">
            <div className="grid g4">
              <div><label>Hotel / night</label><input value={sc.allowances.hotelPerNight} onChange={e=> setSc({...sc, allowances:{...sc.allowances, hotelPerNight:e.target.value}})} /></div>
              <div><label>Meals / day</label><input value={sc.allowances.mealsPerDay} onChange={e=> setSc({...sc, allowances:{...sc.allowances, mealsPerDay:e.target.value}})} /></div>
              <div><label>Laundry / week</label><input value={sc.allowances.laundryPerWeek} onChange={e=> setSc({...sc, allowances:{...sc.allowances, laundryPerWeek:e.target.value}})} /></div>
              <div><label>Incidentals / day</label><input value={sc.allowances.incidentalsPerDay} onChange={e=> setSc({...sc, allowances:{...sc.allowances, incidentalsPerDay:e.target.value}})} /></div>
            </div>
            <div className="muted">Allowances total: <span className="total">{fmt(perDiemTotal, sc.currency.base)}</span></div>
          </Card>

          <Card title="Taxes, Contingency & Currency">
            <div className="grid g3">
              <div><label>Tax/VAT (%)</label><input value={sc.taxes.localTaxPct} onChange={e=> setSc({...sc, taxes:{...sc.taxes, localTaxPct:e.target.value}})} /></div>
              <div><label>Withholding (fixed)</label><input value={sc.taxes.withholdingFixed} onChange={e=> setSc({...sc, taxes:{...sc.taxes, withholdingFixed:e.target.value}})} /></div>
              <div className="row"><input type="checkbox" checked={sc.taxes.applyTaxToLaborOnly} onChange={e=> setSc({...sc, taxes:{...sc.taxes, applyTaxToLaborOnly:e.target.checked}})} /><span className="muted">Apply tax to labor only</span></div>
            </div>
            <div className="grid g3">
              <div><label>Contingency (%)</label><input value={sc.contingencyPct} onChange={e=> setSc({...sc, contingencyPct:e.target.value})} /></div>
              <div>
                <label>Base currency</label>
                <select value={sc.currency.base} onChange={e=> setSc({...sc, currency:{...sc.currency, base:e.target.value}})}>
                  {CCY.map(c=> <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="row"><input type="checkbox" checked={sc.currency.showTarget} onChange={e=> setSc({...sc, currency:{...sc.currency, showTarget:e.target.checked}})} /><span className="muted">Show converted</span></div>
            </div>
            {sc.currency.showTarget && (
              <div className="grid g2">
                <div>
                  <label>Target currency</label>
                  <select value={sc.currency.target} onChange={e=> setSc({...sc, currency:{...sc.currency, target:e.target.value}})}>
                    {CCY.map(c=> <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div><label>Rate (1 {sc.currency.base} = ? {sc.currency.target})</label><input value={sc.currency.rateBaseToTarget} onChange={e=> setSc({...sc, currency:{...sc.currency, rateBaseToTarget:e.target.value}})} /></div>
              </div>
            )}
            <div className="muted">Taxes & contingency total: <span className="total">{fmt(taxesTotal + contingencyTotal, sc.currency.base)}</span></div>
          </Card>
        </div>
      )}

      {tab==='summary' && (
        <div className="grid g2">
          <Card title="Totals">
            <div className="grid">
              <div>Staffing: <span className="total">{fmt(laborTotal, sc.currency.base)}</span></div>
              <div>Visas/Security/Seguros: <span className="total">{fmt(vsiTotal, sc.currency.base)}</span></div>
              <div>Daily rates: <span className="total">{fmt(perDiemTotal, sc.currency.base)}</span></div>
              <div>Airfare: <span className="total">{fmt(airfareTotal, sc.currency.base)}</span></div>
              <div>Local transportation: <span className="total">{fmt(localTransportTotal, sc.currency.base)}</span></div>
              <div>Taxes + Contingency: <span className="total">{fmt(taxesTotal + contingencyTotal, sc.currency.base)}</span></div>
              <div style={{fontSize:18, marginTop:6}}>GRAND TOTAL: <span className="total">{fmt(grandTotalBase, sc.currency.base)}</span> {sc.currency.showTarget && <span className="muted"> — converted: {fmt(converted||0, sc.currency.target)}</span>}</div>
            </div>
          </Card>
          <Card title="Roles (summary)">
            <div className="grid">
              {laborBreakdown.map(r=> (
                <div key={r.id} className="row" style={{justifyContent:'space-between'}}>
                  <div>{r.role} × {r.qty}</div>
                  <div className="total">{fmt(r.total, sc.currency.base)}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
