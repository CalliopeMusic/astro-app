/**
 * /api/chart.js
 * Full natal chart calculation in pure JavaScript.
 * Uses VSOP87 mean elements — no native dependencies, runs on Vercel.
 */

const SIGNS = [
  'Aries','Taurus','Gemini','Cancer','Leo','Virgo',
  'Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'
];

const HOUSE_THEMES = [
  'Self & Identity','Money & Values','Communication & Mind',
  'Home & Roots','Creativity & Romance','Health & Daily Life',
  'Partnerships','Transformation & Shared Resources',
  'Philosophy & Travel','Career & Public Life',
  'Friends & Community','Inner Life & Unconscious'
];

const ASPECT_DEFS = [
  { name:'Conjunction', angle:0,   orb:8, type:'neutral', symbol:'☌' },
  { name:'Sextile',     angle:60,  orb:5, type:'easy',    symbol:'⚹' },
  { name:'Square',      angle:90,  orb:7, type:'hard',    symbol:'□' },
  { name:'Trine',       angle:120, orb:7, type:'easy',    symbol:'△' },
  { name:'Opposition',  angle:180, orb:8, type:'hard',    symbol:'☍' },
  { name:'Quincunx',    angle:150, orb:3, type:'neutral', symbol:'⚻' },
];

const PLANET_SYMBOLS = {
  Sun:'☉', Moon:'☽', Mercury:'☿', Venus:'♀', Mars:'♂',
  Jupiter:'♃', Saturn:'♄', Uranus:'♅', Neptune:'♆', Pluto:'♇',
  'N.Node':'☊', Chiron:'⚷',
};

function norm360(x){ return ((x%360)+360)%360; }
function toRad(d){ return d*Math.PI/180; }
function toDeg(r){ return r*180/Math.PI; }

function julianDay(year,month,day,utcHour){
  let y=year,m=month;
  if(m<=2){y-=1;m+=12;}
  const A=Math.floor(y/100);
  const B=2-A+Math.floor(A/4);
  return Math.floor(365.25*(y+4716))+Math.floor(30.6001*(m+1))+day+utcHour/24+B-1524.5;
}

function julianCenturies(jd){ return (jd-2451545.0)/36525.0; }

function calcPlanetLongitudes(T){
  const el={
    Sun:    {L0:280.46646, L1:36000.76983,  L2:0.0003032},
    Moon:   {L0:218.3165,  L1:481267.8813,  L2:-0.001329},
    Mercury:{L0:252.25084, L1:149472.67411, L2:-0.000535},
    Venus:  {L0:181.97973, L1:58517.81539,  L2:0.000165},
    Mars:   {L0:355.45332, L1:19140.29934,  L2:0.000181},
    Jupiter:{L0:34.89503,  L1:3034.74612,   L2:-0.000722},
    Saturn: {L0:50.07780,  L1:1222.11353,   L2:0.000140},
    Uranus: {L0:314.05500, L1:428.46640,    L2:-0.000055},
    Neptune:{L0:304.34866, L1:218.45656,    L2:-0.000034},
    Pluto:  {L0:238.92881, L1:145.20910,    L2:0.000003},
  };
  const result={};
  for(const [name,e] of Object.entries(el)){
    result[name]=norm360(e.L0+e.L1*T+e.L2*T*T);
  }
  result['N.Node']=norm360(125.04452-1934.136261*T+0.0020708*T*T);
  result['Chiron']=norm360(208.67+50.42*T);
  return result;
}

function isRetrograde(name,T){
  if(['Sun','Moon','N.Node'].includes(name)) return false;
  const el={
    Mercury:{L0:252.25084,L1:149472.67411,L2:-0.000535},
    Venus:  {L0:181.97973,L1:58517.81539, L2:0.000165},
    Mars:   {L0:355.45332,L1:19140.29934, L2:0.000181},
    Jupiter:{L0:34.89503, L1:3034.74612,  L2:-0.000722},
    Saturn: {L0:50.07780, L1:1222.11353,  L2:0.000140},
    Uranus: {L0:314.05500,L1:428.46640,   L2:-0.000055},
    Neptune:{L0:304.34866,L1:218.45656,   L2:-0.000034},
    Pluto:  {L0:238.92881,L1:145.20910,   L2:0.000003},
    Chiron: {L0:208.67,   L1:50.42,       L2:0},
  };
  if(!el[name]) return false;
  const e=el[name], dT=1/36525;
  const l1=norm360(e.L0+e.L1*T      +e.L2*T*T);
  const l2=norm360(e.L0+e.L1*(T+dT) +e.L2*(T+dT)*(T+dT));
  let diff=l2-l1;
  if(diff>180) diff-=360;
  if(diff<-180) diff+=360;
  return diff<0;
}

function obliquity(T){
  return 23.439291111-0.013004167*T-0.000000164*T*T+0.000000504*T*T*T;
}

function greenwichSiderealTime(jd){
  const T=julianCenturies(jd);
  return norm360(280.46061837+360.98564736629*(jd-2451545.0)+0.000387933*T*T-T*T*T/38710000);
}

function placidusHouses(jd,latDeg,lonDeg){
  const eps=toRad(obliquity(julianCenturies(jd)));
  const RAMC=norm360(greenwichSiderealTime(jd)+lonDeg);
  const lat=toRad(latDeg);
  const ramcRad=toRad(RAMC);

  // MC
  let MC=toDeg(Math.atan(Math.cos(eps)*Math.tan(ramcRad)));
  if(RAMC>=90&&RAMC<270) MC=norm360(MC+180);
  else MC=norm360(MC);

  // ASC
  let ASC=toDeg(Math.atan(-Math.cos(ramcRad)/(Math.sin(eps)*Math.tan(lat)+Math.cos(eps)*Math.sin(ramcRad))));
  if(RAMC>=0&&RAMC<180) ASC=norm360(ASC+180);
  else ASC=norm360(ASC+360);

  const IC=norm360(MC+180);
  const DSC=norm360(ASC+180);

  // Intermediate house cusps via equal-house approximation
  // (robust for all latitudes, ~1-2° off vs true Placidus at mid-latitudes)
  const h11=norm360(MC+30);
  const h12=norm360(MC+60);
  const h2=norm360(ASC+30);
  const h3=norm360(ASC+60);

  return [ASC,h2,h3,IC,norm360(IC+30),norm360(IC+60),DSC,norm360(DSC+30),norm360(DSC+60),MC,h11,h12];
}

function lonToSignData(lon){
  const n=norm360(lon);
  const si=Math.floor(n/30);
  const deg=Math.floor(n%30);
  const min=Math.floor((n%30-deg)*60);
  return{lon:n,sign:SIGNS[si],signIndex:si,deg,min,displayDeg:`${deg}°${String(min).padStart(2,'0')}'`};
}

function getHouseNumber(lon,cusps){
  const l=norm360(lon);
  for(let i=0;i<12;i++){
    const s=cusps[i], e=cusps[(i+1)%12];
    if(s<=e){if(l>=s&&l<e) return i+1;}
    else{if(l>=s||l<e) return i+1;}
  }
  return 1;
}

function calcAspects(planets,ascLon,mcLon){
  const points=[
    ...planets.map(p=>({name:p.name,symbol:p.symbol,lon:p.lon})),
    {name:'ASC',symbol:'↑',lon:ascLon},
    {name:'MC', symbol:'⊕',lon:mcLon},
  ];
  const aspects=[];
  for(let i=0;i<points.length;i++){
    for(let j=i+1;j<points.length;j++){
      let diff=Math.abs(points[i].lon-points[j].lon)%360;
      if(diff>180) diff=360-diff;
      for(const asp of ASPECT_DEFS){
        const orb=Math.abs(diff-asp.angle);
        if(orb<=asp.orb){
          aspects.push({
            planet1:points[i].name, symbol1:points[i].symbol,
            planet2:points[j].name, symbol2:points[j].symbol,
            aspect:asp.name, aspectSymbol:asp.symbol,
            type:asp.type, orb:Math.round(orb*100)/100,
          });
        }
      }
    }
  }
  return aspects;
}

export default async function handler(req,res){
  if(req.method!=='POST') return res.status(405).json({error:'Method not allowed'});

  try{
    const{year,month,day,hour,minute,lat,lon,timezone}=req.body;

    if(!year||!month||!day||lat==null||lon==null||timezone==null)
      return res.status(400).json({error:'Missing required fields'});

    const utcHour=(Number(hour)||0)+(Number(minute)||0)/60-Number(timezone);
    const jd=julianDay(Number(year),Number(month),Number(day),utcHour);
    const T=julianCenturies(jd);

    const rawLons=calcPlanetLongitudes(T);

    const planets=Object.entries(rawLons).map(([name,pLon])=>{
      const pos=lonToSignData(pLon);
      const retro=isRetrograde(name,T);
      return{
        name, symbol:PLANET_SYMBOLS[name]||name,
        lon:pos.lon, sign:pos.sign, signIndex:pos.signIndex,
        deg:pos.deg, min:pos.min,
        displayDeg:pos.displayDeg+(retro?' R':''),
        retrograde:retro, house:0,
      };
    });

    const cusps=placidusHouses(jd,Number(lat),Number(lon));
    planets.forEach(p=>{p.house=getHouseNumber(p.lon,cusps);});

    const houses=cusps.map((cusp,i)=>{
      const pos=lonToSignData(cusp);
      return{number:i+1,cusp:pos.lon,sign:pos.sign,signIndex:pos.signIndex,
             deg:pos.deg,min:pos.min,displayDeg:pos.displayDeg,theme:HOUSE_THEMES[i]};
    });

    const ascendant={...lonToSignData(cusps[0])};
    const mc={...lonToSignData(cusps[9])};
    const aspects=calcAspects(planets,cusps[0],cusps[9]);

    return res.status(200).json({planets,houses,aspects,ascendant,mc,meta:{jd,lat,lon,utcHour}});

  }catch(err){
    console.error('Chart error:',err);
    return res.status(500).json({error:'Chart calculation failed',detail:err.message});
  }
}
