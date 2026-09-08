import {type State,today,addMonths} from '@/shared/finance';
export function demoState(month=today().slice(0,7)):State {
const d=(day:number)=>`${month}-${String(day).padStart(2,'0')}`;
return {accounts:[{id:'a1',name:'Conta principal',kind:'checking',opening:125000,color:'#8050c6',limit:0,closing:1,due:1},{id:'a2',name:'Carteira',kind:'cash',opening:18000,color:'#d99a38',limit:0,closing:1,due:1},{id:'a3',name:'Meu cartão',kind:'credit',opening:0,color:'#384c46',limit:450000,closing:5,due:12}],transactions:[
{id:'t1',title:'Salário',amount:480000,type:'income',category:'Salário',accountId:'a1',date:d(1),status:'paid'},
{id:'t2',title:'Aluguel',amount:120000,type:'expense',category:'Moradia',accountId:'a1',date:d(2),status:'paid'},
{id:'t3',title:'Mercado da semana',amount:23890,type:'expense',category:'Alimentação',accountId:'a1',date:d(4),status:'paid'},
{id:'t4',title:'Café da manhã',amount:1850,type:'expense',category:'Alimentação',accountId:'a1',date:d(6),status:'paid'},
{id:'t5',title:'Uber · volta para casa',amount:2490,type:'expense',category:'Transporte',accountId:'a1',date:d(7),status:'paid'},
{id:'t6',title:'Cinema com amigos',amount:6800,type:'expense',category:'Lazer',accountId:'a1',date:d(7),status:'paid'},
{id:'t7',title:'Internet',amount:9990,type:'expense',category:'Moradia',accountId:'a1',date:d(15),status:'pending'},
{id:'t8',title:'Academia',amount:12990,type:'expense',category:'Saúde',accountId:'a1',date:d(18),status:'pending'},
{id:'t9',title:'Compras no cartão',amount:32750,type:'expense',category:'Compras',accountId:'a3',date:d(12),status:'pending'},
{id:'t10',title:'Spotify',amount:2190,type:'expense',category:'Assinaturas',accountId:'a3',date:d(12),status:'pending'},
],budgets:[{id:'b1',category:'Alimentação',amount:70000,month},{id:'b2',category:'Lazer',amount:30000,month},{id:'b3',category:'Transporte',amount:25000,month}],goals:[{id:'g1',name:'Reserva de emergência',target:1000000,saved:350000,date:addMonths(d(28),12),color:'#24a67a'},{id:'g2',name:'Próxima viagem',target:400000,saved:120000,date:addMonths(d(28),6),color:'#5376d9'}]};
}
