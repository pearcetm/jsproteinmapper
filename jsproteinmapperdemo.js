$(document).ready(function(){

var jspm = new jsProteinMapper();
jspm.init({target:'#gene-info'});

$('#controls>button').on('click',function(){
	var s=$('#controls>input').val();
	if(s && s.length>0)
	{
		$.ajax({
			url:'https://rest.genenames.org/fetch/symbol/'+s,
			type:'GET',
			dataType:'xml',
			success:uniprotCallback,
			failure:function(data,textStatus,jqXHR){
				console.log('Genenames proxy failed',JSON.stringify(data));
			},
		});
	}
});

function uniprotCallback(data,textStatus,jqXHR){
	var s=$('#controls>input').val();
	var response=$(data);
	if(response.find('result').attr('numFound')==0) $('#gene-name').text('No genes found - please search again');
	else if(response.find('result').attr('numFound')==1){
		$('#gene-name').text('One gene found - ' + response.find('[name="name"]').text() + '. Loading annotations.');
		jspm.init({target:'#gene-info'});
		var id = response.find('[name="uniprot_ids"] str').text();
		switch(s.toLowerCase()){
			case "braf":
				getDemoData('braf',function(variant_string){
					jspm.setVariant({codon:600,annotation:{'Protein alteration':'p.V600E'} });						
					var demo2=getVariants(s);
					var variants1 = jspm.helpers.parseVariantString('BRAF', variant_string);
					var variants2 = jspm.helpers.parseVariantString('braf', demo2);
					
					//var aggregated_variants1=jspm.helpers.aggregate(variants1, jspm.helpers.tooltips.variantPiechart);
					var aggregated_variants1=jspm.helpers.aggregate(variants1, jspm.helpers.tooltips.variantBarchart);
					var aggregated_variants2=jspm.helpers.aggregate(variants2, jspm.helpers.tooltips.variantBarchart);
					
					jspm.setTracks([
						{
							label:'COSMIC v84',
							data:aggregated_variants1
						},
						{
							label:'Data source 2 (e.g. in-house database)',
							data:aggregated_variants2
						}
					]);
				});
				
				break;
			case 'tp53':
				getDemoData('tp53',function(variant_string){
					jspm.setVariant({codon:245, annotation:{'Protein alteration':'p.G245S'}});
					var parsedVariantString = jspm.helpers.parseVariantString('tp53', variant_string);
					var trackData = jspm.helpers.aggregate(parsedVariantString, jspm.helpers.tooltips.variantTable);
					jspm.setTracks([
						{
							label:'COSMIC v84', 
							data: trackData,
					   },
				   ]);
				});
				
			   break;
			case 'pik3ca':
			   getDemoData('pik3ca',function(variant_string){
					jspm.setVariant({codon:1047, annotation:{'Protein alteration':'p.H1047R'}});
					var parsedVariantString = jspm.helpers.parseVariantString('pik3ca', variant_string);
					var trackData = jspm.helpers.aggregate(parsedVariantString, jspm.helpers.tooltips.variantPiechart);
					jspm.setTracks([
						{
							label:'COSMIC v84', 
							data: trackData,
					   },
				   ]);
				});
				break;
				
		}
		
		fetchProteinStructInfo(id);
	}
	if(response.find('result').attr('numFound')>1) {
		$('#gene-name').text('Multiple genes found. Please select one.');
		var names=response.find('[name="name"]');
		names.each(function(){$('#gene-name').append($(this).text());});
	}
}
function fetchProteinStructInfo(id)
{
	$.ajax({
		url:'https://pfam.xfam.org/protein/'+id+'/graphic',
		type:'GET',
		success:jspm.helpers.pfamAjaxResults(function(r){
			jspm.setPfamData(r); 
			jspm.drawWidget(); 
			}),
		failure:function(data,textStatus,jqXHR){
			console.log('Failed to fetch data from PFAM',JSON.stringify(data));
		},
	});
}


});

function barTT(mut){
	var tt = $('<div>').css({border:'thin black solid',backgroundColor:'white',padding:'0.2em',display:'inline-block','text-align':'center'});
	var nest = mut.nestedAlterations;	
	
	
	var dt = d3.select(tt[0]);
	dt.append('h3').text(mut.wildtype+': '+mut.count+' variants reported');
	
		
		
	var stack = d3.stack()	
		.keys(nest.map(function(e){return e.key; }))
    	.order(d3.stackOrderNone)
    	.offset(d3.stackOffsetNone);
   var data={};
   nest.forEach(function(e){ data[e.key] = e.value; }); 	
   var series=stack([data]);
   var w = series.length * 45;
   
   var total = series[series.length-1][0][1];
   var x = d3.scaleLinear()
   		.range([0,w])
   		.domain([0,  total]);
   	
   	var svg = dt.append('svg')
		.attr('width',w)
		.attr('height',60)
		.style('overflow','visible');
   	svg.selectAll('.rect')
   		.data(series)
   		.enter()
   		.append('rect')
   		.attr('x',function(d){
   			return x(d[0][0]); })
   		.attr('width',function(d){ 
   			return x(d[0][1])-x(d[0][0]); })
   		.attr('y',25)
   		.attr('height',10)
   		.attr("fill", function(d) {
				var colorIndex=d.index % 10; 
				return d3.schemeCategory10[colorIndex];
			 });
   	svg.selectAll('.aaname')
   		.data(series)
   		.enter()
   		.append('text')
   		.attr('class','aaname')
   		.attr('x',function(d){
   			return x(d[0][0]) + x(d[0][1]-d[0][0])/2; })
   		.attr('text-anchor','middle')
   		.attr('y',25)
   		.attr('dy','-0.3em')
   		.text(function(d){return d.key; });
   	
   	svg.selectAll('.aapct')
   		.data(series)
   		.enter()
   		.append('text')
   		.attr('class','aapct')
   		.attr('x',function(d){
   			return x(d[0][0]) + x(d[0][1]-d[0][0])/2; })
   		.attr('text-anchor','middle')
   		.attr('alignment-baseline','hanging')
   		.attr('y',35)
   		.attr('dy','0.3em')
   		.text(function(d){
   			return ''+Math.round(100*(d[0][1]-d[0][0]) / total)+'%'; });
		
	return tt;
}

function getDemoData(gene,callback){
	
	switch(gene.toLowerCase()){
		case 'tp53': 
			$.ajax({
    				type:'GET',
    				url:'/assets/scripts/genomics/tp53.coding.cosmic84.demo.txt',
    				success:callback,
					error:function(d){
						console.log('Error loading demonstration tp53 data from COSMIC:', d);
					}    				
    			});
			break;
		case 'pik3ca':
			$.ajax({
    				type:'GET',
    				url:'/assets/scripts/genomics/pik3ca.coding.cosmic84.demo.txt',
    				success:callback,
					error:function(d){
						console.log('Error loading demonstration pik3ca data from COSMIC:', d);
					}    				
    			}); 
			break;
		case 'braf': 
			$.ajax({
    				type:'GET',
    				url:'/assets/scripts/genomics/braf.coding.cosmic84.demo.txt',
    				success:callback,
					error:function(d){
						console.log('Error loading demonstration braf data from COSMIC:', d);
					}    				
    			});
			break;
	}
}


function getVariants(protein){
	var mut={
		tp53:'\
		GENE_NAME	CDNA_CHANGE	PROTEIN_CHANGE  \		TP53	c.1176_1177insA	p.D393fs*>2  \		TP53	c.1176A>G	p.S392S  \		TP53	c.1175C>T	p.S392L  \		TP53	c.1174T>C	p.S392P  \		TP53	c.1171G>A	p.D391N  \		TP53	c.1146delA	p.K382fs*>12  \		TP53	c.1147C>T	p.L383F  \		TP53	c.1143delA	p.K382fs*>12  \		TP53	c.1143A>T	p.K381N  \		TP53	c.1141delA	p.K382fs*>12  \		TP53	c.1140T>C	p.H380H  \		TP53	c.1137C>T	p.R379R  \		TP53	c.1136G>A	p.R379H  \		TP53	c.1129A>C	p.T377P  \		TP53	c.1128T>C	p.S376S  \		TP53	c.1126T>C	p.S376P  \		TP53	c.1126T>A	p.S376T  \		TP53	c.1126T>G	p.S376A  \		TP53	c.1122_1123insG	p.Q375fs*7  \		TP53	c.1123C>T	p.Q375*  \		TP53	c.1123C>A	p.Q375K  \		TP53	c.1118A>G	p.K373R  \		TP53	c.1108A>C	p.K370Q  \		TP53	c.1097_1100delCCAG	p.S367fs*2  \		TP53	c.1099delA	p.S367fs*3  \		TP53	c.1096T>G	p.S366A  \		TP53	c.994_1093del100	p.I332fs*5  \		TP53	c.1090G>A	p.A364T  \		TP53	c.1084delA	p.S362fs*8  \		TP53	c.1082G>A	p.G361E  \		TP53	c.1075C>T	p.P359S  \		TP53	c.1073A>T	p.E358V  \		TP53	c.1066delG	p.K357fs*13  \		TP53	c.1066G>T	p.G356W  \		TP53	c.1061A>G	p.Q354R  \		TP53	c.1060C>A	p.Q354K  \		TP53	c.1060C>T	p.Q354*  \		TP53	c.1049_1059del11	p.L350fs*28',
		braf:' \
		BRAF	c.2295C>T	p.V765V  \BRAF	c.2285C>A	p.A762E  \BRAF	c.2195C>T	p.S732F  \BRAF	c.2193C>T	p.P731P  \BRAF	c.2191C>T	p.P731S  \BRAF	c.2153C>T	p.A718V \BRAF	c.2093A>G	p.K698R \BRAF	c.2083G>C	p.E695Q \BRAF	c.2045G>A	p.R682Q \BRAF	c.2044C>T	p.R682W \BRAF	c.2032C>A	p.L678I \BRAF	c.2012G>A	p.R671Q \BRAF	c.1998T>C	p.I666I \BRAF	c.1971A>G	p.S657S \BRAF	c.1943A>G	p.E648G \BRAF	c.1929A>G	p.G643G \BRAF	c.1915G>A	p.V639I \BRAF	c.1910C>T	p.S637L \BRAF	c.1910C>G	p.S637* \BRAF	c.1909T>C	p.S637P \BRAF	c.1907A>G	p.Q636R \BRAF	c.1906C>T	p.Q636* \BRAF	c.1906C>G	p.Q636E \BRAF	c.1855T>C	p.W619R \BRAF	c.1853T>C	p.L618S \BRAF	c.1853T>G	p.L618W \
BRAF	c.1852T>C	p.L618L \BRAF	c.1850T>C	p.I617T \BRAF	c.1847C>T	p.S616F \BRAF	c.1846T>C	p.S616P \BRAF	c.1843G>A	p.G615R \BRAF	c.1842T>C	p.S614S \BRAF	c.1840T>C	p.S614P \BRAF	c.1834C>T	p.Q612* \BRAF	c.1834C>G	p.Q612E \BRAF	c.1833A>G	p.E611E \BRAF	c.1833A>C	p.E611D \BRAF	c.1832A>G	p.E611G \BRAF	c.1830T>C	p.F610F \BRAF	c.1829T>C	p.F610S \BRAF	c.1828T>C	p.F610L \BRAF	c.1827G>A	p.Q609Q \BRAF	c.1827G>T	p.Q609H \BRAF	c.1826A>G	p.Q609R \BRAF	c.1825C>T	p.Q609* \BRAF	c.1824T>C	p.H608H \BRAF	c.1823A>G	p.H608R \BRAF	c.1816_1818GGG>AGT	p.G606S \BRAF	c.1819T>C	p.S607P \BRAF	c.1818G>A	p.G606G \BRAF	c.1817G>A	p.G606E \BRAF	c.1817G>C	p.G606A \BRAF	c.1817G>T	p.G606V \BRAF	c.1816G>A	p.G606R \BRAF	c.1799_1815>AAAAG	p.V600_S605>EK \BRAF	c.1799_1814>A	p.V600_S605>D \BRAF	c.1813_1814AG>TT	p.S605F \BRAF	c.1815T>A	p.S605R \BRAF	c.1799_1814>ATGT	p.V600_S605>DV \BRAF	c.1814G>A	p.S605N \BRAF	c.1813A>G	p.S605G \BRAF	c.1812G>A	p.W604* \BRAF	c.1811G>A	p.W604* \BRAF	c.1797_1810>TGATG	p.V600_W604>DG \BRAF	c.1808_1810delGAT	p.W604del \BRAF	c.1810T>G	p.W604G \BRAF	c.1810T>A	p.W604R \BRAF	c.1796_1809>TC	p.T599_R603>I \BRAF	c.1809A>G	p.R603R \BRAF	c.1808G>T	p.R603L \BRAF	c.1807C>A	p.R603R \BRAF	c.1807C>T	p.R603* \BRAF	c.1806T>G	p.S602S \BRAF	c.1801_1803delAAA	p.K601del \BRAF	c.1803A>C	p.K601N \BRAF	c.1803A>G	p.K601K \BRAF	c.1803A>T	p.K601N \BRAF	c.1799_1801delTGA	p.V600_K601>E \BRAF	c.1802A>G	p.K601R \BRAF	c.1802A>T	p.K601I \BRAF	c.1799_1800delTG	p.V600fs*11 \BRAF	c.1799_1800TG>AC	p.V600D \BRAF	c.1799_1800TG>AA	p.V600E \BRAF	c.1799_1800TG>AT	p.V600D \
BRAF	c.1801A>G	p.K601E \BRAF	c.1797_1799AGT>GAG	p.V600R \BRAF	c.1800G>T	p.V600V \BRAF	c.1798_1799GT>CG	p.V600R \BRAF	c.1796_1799CAGT>TAAA	p.T599_V600>IK \BRAF	c.1798_1799GT>CA	p.V600Q \BRAF	c.1800G>A	p.V600V \BRAF	c.1798_1799GT>AA	p.V600K \BRAF	c.1798_1799GT>AG	p.V600R \BRAF	c.1798_1798G>TACA	p.V600>YM \BRAF	c.1799T>C	p.V600A \BRAF	c.1798_1799ins18	p.T599_V600insDFGLAT \BRAF	c.1796_1798CAG>TAGCTT	p.T599_V600>IAL \BRAF	c.1799T>A	p.V600E \
BRAF	c.1799T>A	p.V600E \
BRAF	c.1799T>A	p.V600E \
BRAF	c.1799T>A	p.V600E \
BRAF	c.1799T>A	p.V600E \
BRAF	c.1799T>A	p.V600E \
BRAF	c.1799T>A	p.V600E \
BRAF	c.1799T>A	p.V600E \
BRAF	c.1799T>A	p.V600E \
BRAF	c.1799T>A	p.V600E \
BRAF	c.1799T>A	p.V600E \
BRAF	c.1799T>A	p.V600E \
BRAF	c.1799T>A	p.V600E \
BRAF	c.1799T>A	p.V600E \
BRAF	c.1799T>A	p.V600E \BRAF	c.1799T>G	p.V600G \BRAF	c.1797_1797A>TACTACG	p.T599_V600insTT \BRAF	c.1798G>A	p.V600M \BRAF	c.1797_1798insACA	p.T599_V600insT \BRAF	c.1798G>C	p.V600L \BRAF	c.1797_1798ins?	p.T599_V600insTT \BRAF	c.1798G>T	p.V600L \BRAF	c.1794_1796delTAC	p.T599del \BRAF	c.1797A>G	p.T599T \BRAF	c.1797A>T	p.T599T \BRAF	c.1797A>B	p.T599T \BRAF	c.1796_1797insTAC	p.T599_V600insT \BRAF	c.1796C>T	p.T599I \BRAF	c.1794_1795insGTT	p.A598_T599insV \BRAF	c.1794T>A	p.A598A \BRAF	c.1793C>T	p.A598V \BRAF	c.1792G>A	p.A598T \BRAF	c.1791A>G	p.L597L \BRAF	c.1789_1790CT>TC	p.L597S \BRAF	c.1790T>A	p.L597Q \BRAF	c.1790T>C	p.L597P \BRAF	c.1790T>G	p.L597R \BRAF	c.1789C>G	p.L597V \BRAF	c.1788T>C	p.G596G \BRAF	c.1787G>A	p.G596D \BRAF	c.1786delG	p.G596fs*2 \BRAF	c.1786G>C	p.G596R \BRAF	c.1785T>C	p.F595F \BRAF	c.1785T>G	p.F595L \BRAF	c.1785T>A	p.F595L \BRAF	c.1784T>C	p.F595S \BRAF	c.1783T>C	p.F595L \BRAF	c.1782T>A	p.D594E \BRAF	c.1782T>C	p.D594D \BRAF	c.1782T>G	p.D594E \BRAF	c.1781A>C	p.D594A \BRAF	c.1779_1780TG>GA	p.D594N \BRAF	c.1781A>T	p.D594V \BRAF	c.1781A>G	p.D594G \BRAF	c.1780G>C	p.D594H \BRAF	c.1780G>A	p.D594N \BRAF	c.1778G>A	p.G593D \BRAF	c.1777G>T	p.G593C \BRAF	c.1777G>A	p.G593S \BRAF	c.1776A>G	p.I592M \BRAF	c.1776A>T	p.I592I \BRAF	c.1774A>G	p.I592V \BRAF	c.1772A>G	p.K591R \BRAF	c.1771A>G	p.K591E \BRAF	c.1770A>G	p.V590V \BRAF	c.1769delT	p.V590fs*3 \BRAF	c.1769T>C	p.V590A \BRAF	c.1768G>A	p.V590I \BRAF	c.1767A>G	p.T589T \BRAF	c.1766C>T	p.T589I \BRAF	c.1765A>G	p.T589A \BRAF	c.1764C>T	p.L588L \BRAF	c.1763T>G	p.L588R \BRAF	c.1763T>C	p.L588P \BRAF	c.1762C>T	p.L588F \BRAF	c.1761C>A	p.D587E \BRAF	c.1761C>G	p.D587E \BRAF	c.1760A>G	p.D587G \BRAF	c.1760A>C	p.D587A \BRAF	c.1759G>A	p.D587N \BRAF	c.1758A>G	p.E586E \BRAF	c.1756G>A	p.E586K \BRAF	c.1755T>C	p.H585H \BRAF	c.1752T>C	p.L584L \BRAF	c.1751T>C	p.L584P \BRAF	c.1750C>T	p.L584F \BRAF	c.1749T>C	p.F583F \BRAF	c.1748T>C	p.F583S \BRAF	c.1746A>G	p.I582M \BRAF	c.1742A>C	p.N581T \BRAF	c.1742A>T	p.N581I \BRAF	c.1742A>G	p.N581S \BRAF	c.1722C>A	p.H574Q \BRAF	c.1720C>A	p.H574N \BRAF	c.1710G>A	p.K570K \BRAF	c.1704C>T	p.H568H \BRAF	c.1624C>T	p.H542Y \BRAF	c.1620T>G	p.H540Q \BRAF	c.1616A>C	p.H539P \BRAF	c.1610T>C	p.L537S \BRAF	c.1609T>A	p.L537M \BRAF	c.1593G>T	p.W531C \BRAF	c.1541T>C	p.L514P \BRAF	c.1525C>T	p.R509* \BRAF	c.1516_1517insAGTACTCAG	p.R506>KYSG \BRAF	c.1514T>A	p.L505H \BRAF	c.1507_1508insAGTACTCAG	p.V502_G503insEYS \BRAF	c.1457_1471del15	p.N486_P490del \BRAF	c.1454_1469>A	p.L485_P490>Y \BRAF	c.1461G>A	p.V487V \BRAF	c.1460T>C	p.V487A \BRAF	c.1450_1458delATGTTGAAT	p.M484_N486delMLN \BRAF	c.1459G>T	p.V487L \BRAF	c.1455G>T	p.L485F \BRAF	c.1454T>G	p.L485W \BRAF	c.1454T>C	p.L485S \BRAF	c.1453T>C	p.L485L \BRAF	c.1447A>G	p.K483E \BRAF	c.1435G>T	p.D479Y \BRAF	c.1425G>A	p.K475K \BRAF	c.1424A>T	p.K475M \BRAF	c.1424A>G	p.K475R \BRAF	c.1415A>G	p.Y472C \BRAF	c.1415A>C	p.Y472S \BRAF	c.1412T>C	p.V471A \BRAF	c.1411G>A	p.V471I \BRAF	c.1411G>T	p.V471F \BRAF	c.1405_1407GGA>AGC	p.G469S \BRAF	c.1405_1407GGA>AGT	p.G469S \BRAF	c.1407A>G	p.G469G \BRAF	c.1405_1406GG>TT	p.G469L \BRAF	c.1405_1406GG>TC	p.G469S \BRAF	c.1406G>T	p.G469V \BRAF	c.1406G>C	p.G469A \BRAF	c.1406G>A	p.G469E \BRAF	c.1405G>C	p.G469R \BRAF	c.1405G>A	p.G469R \BRAF	c.1404T>C	p.F468F \BRAF	c.1403T>C	p.F468S \BRAF	c.1403T>G	p.F468C \BRAF	c.1402T>C	p.F468L \BRAF	c.1400C>T	p.S467L \BRAF	c.1399T>C	p.S467P \BRAF	c.1398A>G	p.G466G \BRAF	c.1397G>T	p.G466V \BRAF	c.1397G>C	p.G466A \BRAF	c.1397G>A	p.G466E \BRAF	c.1396G>C	p.G466R \BRAF	c.1396G>A	p.G466R \BRAF	c.1395T>C	p.S465S \BRAF	c.1394C>T	p.S465F \BRAF	c.1391G>A	p.G464E \BRAF	c.1391G>T	p.G464V \BRAF	c.1390G>C	p.G464R \BRAF	c.1390G>A	p.G464R \BRAF	c.1389T>C	p.I463I \BRAF	c.1388T>G	p.I463S \BRAF	c.1387A>G	p.I463V \BRAF	c.1386A>G	p.R462R \BRAF	c.1385G>A	p.R462K \BRAF	c.1385G>T	p.R462I \BRAF	c.1384A>G	p.R462G \BRAF	c.1380A>G	p.G460G \BRAF	c.1378G>T	p.G460* \BRAF	c.1377G>A	p.V459V \BRAF	c.1376T>C	p.V459A \BRAF	c.1375G>C	p.V459L \BRAF	c.1370T>C	p.I457T \BRAF	c.1368G>A	p.Q456Q \BRAF	c.1367A>G	p.Q456R \BRAF	c.1366C>T	p.Q456* \BRAF	c.1364G>A	p.G455E \BRAF	c.1363G>A	p.G455R \BRAF	c.1359T>C	p.P453P \BRAF	c.1357C>A	p.P453T \BRAF	c.1353G>C	p.E451D \BRAF	c.1349G>A	p.W450* \BRAF	c.1349G>T	p.W450L \BRAF	c.1345G>A	p.D449N \BRAF	c.1341T>C	p.S447S \BRAF	c.1338G>C	p.S446S \BRAF	c.1332G>A	p.R444R \BRAF	c.1332G>T	p.R444R \BRAF	c.1331G>T	p.R444L \BRAF	c.1331G>A	p.R444Q \BRAF	c.1330C>T	p.R444W \BRAF	c.1324G>A	p.G442S \BRAF	c.1320A>G	p.T440T \BRAF	c.1318A>G	p.T440A \BRAF	c.1318A>C	p.T440P \BRAF	c.1316A>C	p.K439T \BRAF	c.1315A>C	p.K439Q \BRAF	c.1297G>A	p.E433K \BRAF	c.1283C>A	p.S428* \BRAF	c.1282T>A	p.S428T \BRAF	c.1263A>G	p.G421G \BRAF	c.1262G>T	p.G421V \BRAF	c.1256C>A	p.S419Y \BRAF	c.1208_1209insC	p.A404fs*9 \BRAF	c.1208delC	p.P403fs*8 \BRAF	c.1202C>T	p.T401I \BRAF	c.1181C>G	p.S394* \BRAF	c.1138G>C	p.D380H \BRAF	c.1100C>G	p.P367R \BRAF	c.1094C>T	p.S365L \BRAF	c.1091C>T	p.S364L \BRAF	c.1074G>C	p.G358G \BRAF	c.1070T>C	p.F357S \BRAF	c.1061G>A	p.R354Q \BRAF	c.977T>C	p.I326T \BRAF	c.976A>G	p.I326V \BRAF	c.969G>A	p.S323S \BRAF	c.965C>T	p.A322V \BRAF	c.946T>C	p.S316P \BRAF	c.929C>T	p.T310I \BRAF	c.925G>T	p.E309* \BRAF	c.914C>T	p.A305V \BRAF	c.898A>G	p.I300V \BRAF	c.892C>T	p.H298Y \BRAF	c.882C>A	p.F294L \BRAF	c.812G>A	p.R271H \BRAF	c.773G>T	p.G258V \BRAF	c.771G>T	p.Q257H \BRAF	c.741T>G	p.F247L \BRAF	c.613A>C	p.K205Q \BRAF	c.603G>T	p.Q201H \BRAF	c.592T>C	p.Y198H \BRAF	c.582C>A	p.C194* \BRAF	c.550G>A	p.A184T \BRAF	c.532C>T	p.R178* \BRAF	c.477C>G	p.V159V \BRAF	c.468C>T	p.I156I \BRAF	c.454C>T	p.P152S \BRAF	c.436C>T	p.R146W \BRAF	c.386C>T	p.S129L \BRAF	c.338G>T	p.S113I \BRAF	c.305C>T	p.S102F \BRAF	c.284G>C	p.R95T \BRAF	c.267A>G	p.L89L \BRAF	c.224C>T	p.P75L \BRAF	c.190C>A	p.L64I \BRAF	c.168G>A	p.L56L \BRAF	c.158T>C	p.M53T \BRAF	c.146A>T	p.N49I \BRAF	c.89G>A	p.G30D \BRAF	c.37G>T	p.E13*',
		pik3ca:'\
		PIK3CA	c.193G>A	p.E65K \		PIK3CA	c.210C>T	p.F70F \		PIK3CA	c.214A>G	p.S72G \		PIK3CA	c.223C>A	p.Q75K \		PIK3CA	c.223C>G	p.Q75E \		PIK3CA	c.225A>G	p.Q75Q \		PIK3CA	c.238G>A	p.E80K \		PIK3CA	c.241G>A	p.E81K \		PIK3CA	c.241G>T	p.E81* \		PIK3CA	c.248T>A	p.F83Y \		PIK3CA	c.253G>A	p.E85K \		PIK3CA	c.260G>C	p.R87T \		PIK3CA	c.262C>T	p.R88* \		PIK3CA	c.263G>A	p.R88Q \		PIK3CA	c.264A>G	p.R88R \		PIK3CA	c.268T>G	p.C90G \		PIK3CA	c.269G>C	p.C90S \		PIK3CA	c.269G>A	p.C90Y \		PIK3CA	c.277C>T	p.R93W \		PIK3CA	c.278G>T	p.R93L \		PIK3CA	c.278G>A	p.R93Q \		PIK3CA	c.304_306delATT	p.I102delI \		PIK3CA	c.307_312delGAACCA	p.E103_P104delEP \		PIK3CA	c.309_317delACCAGTAGG	p.E103_G106>D \		PIK3CA	c.308A>G	p.E103G \		PIK3CA	c.309A>G	p.E103E \		PIK3CA	c.310C>A	p.P104T \		PIK3CA	c.311_316delCAGTAG	p.P104_G106>R \		PIK3CA	c.311C>T	p.P104L \		PIK3CA	c.311C>G	p.P104R \		PIK3CA	c.312A>G	p.P104P \		PIK3CA	c.313_324del12	p.V105_R108delVGNR \		PIK3CA	c.315_320delAGGCAA	p.G106_N107delGN \		PIK3CA	c.316_324del9	p.G106_R108del \		PIK3CA	c.316G>A	p.G106S \		PIK3CA	c.316G>C	p.G106R \		PIK3CA	c.317G>C	p.G106A \		PIK3CA	c.317G>T	p.G106V \		PIK3CA	c.318C>A	p.G106G \		PIK3CA	c.320A>G	p.N107S \		PIK3CA	c.321_323delCCG	p.R108del \		PIK3CA	c.323G>A	p.R108H \		PIK3CA	c.323G>T	p.R108L \		PIK3CA	c.323G>C	p.R108P \		PIK3CA	c.324T>C	p.R108R \		PIK3CA	c.325_327delGAA	p.E109del \		PIK3CA	c.327_335delAGAAAAGAT	p.E109_I112>D \		PIK3CA	c.328G>A	p.E110K \		PIK3CA	c.330A>G	p.E110E \		PIK3CA	c.331_333delAAG	p.K111delK \		PIK3CA	c.331A>G	p.K111E \		PIK3CA	c.332_334delAGA	p.K111del \		PIK3CA	c.332A>G	p.K111R \		PIK3CA	c.333_335delGAT	p.K111_I112>N \		PIK3CA	c.333G>C	p.K111N \		PIK3CA	c.333G>T	p.K111N \		PIK3CA	c.335_337delTCC	p.L113delL \		PIK3CA	c.334A>G	p.I112V \		PIK3CA	c.335T>A	p.I112N \		PIK3CA	c.336C>T	p.I112I \		PIK3CA	c.336C>A	p.I112I',
	}
	return mut[protein.toLowerCase()];
}