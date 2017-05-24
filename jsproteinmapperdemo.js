$(document).ready(function(){

var jspm = new jsProteinMapper();
jspm.init({target:'#gene-info'});

$('#controls>button').on('click',function(){
	var s=$('#controls>input').val();
	if(s && s.length>0)
	{
		$.ajax({
			url:'http://rest.genenames.org/fetch/symbol/'+s,
			//url:'https://tmpearce.com/genomics/genename/',
			//data:{symbol:s},
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
				jspm.setMutation({codon:600,annotation:{'Protein alteration':'p.V600E'} });						
				var brafMut=getMutations(s);
				
				var bm = jspm.helpers.parseMutationString(s, brafMut);
				var m1=jspm.helpers.aggregate(bm.slice(0,Math.floor(bm.length/2)), jspm.helpers.tooltips.mutationPiechart);
				var m2=jspm.helpers.aggregate(bm.slice(Math.floor(bm.length/2)), jspm.helpers.tooltips.mutationBarchart);
				jspm.setTracks([{label:'Data source 1 (e.g. COSMIC)',data:m1}, {label:'Data source 2 (e.g. in-house database)',data:m2}]);
				break;
			case 'tp53':
				jspm.setMutation({codon:245, annotation:{'Protein alteration':'p.G245S'}});
				jspm.setTracks([{label:'Example data', data: jspm.helpers.aggregate(jspm.helpers.parseMutationString(s,getMutations(s)), jspm.helpers.tooltips.mutationTable) }]);
				break;
			case 'pik3ca':
				jspm.setMutation({codon:1047, annotation:{'Protein alteration':'p.H1047R'}});
				jspm.setTracks([{label:'Example data', data: jspm.helpers.aggregate(jspm.helpers.parseMutationString(s,getMutations(s))) }]);
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
	var data={id: id};
	$.ajax({
		url:'http://tmpearce.com/genomics/graphic',
		type:'GET',
		data:data,
		success:jspm.helpers.pfamAjaxResults(function(r){jspm.setPfamData(r); jspm.drawWidget(); }),
		failure:function(data,textStatus,jqXHR){
			console.log('Pfam proxy failed',JSON.stringify(data));
		},
	});
}


});

function barTT(mut){
	var tt = $('<div>').css({border:'thin black solid',backgroundColor:'white',padding:'0.2em',display:'inline-block','text-align':'center'});
	var nest = mut.nestedAlterations;	
	
	
	var dt = d3.select(tt[0]);
	dt.append('h3').text(mut.wildtype+': '+mut.count+' mutations reported');
	
		
		
	var stack = d3.stack()	
		.keys(nest.map(function(e){return e.key; }))
    	.order(d3.stackOrderNone)
    	.offset(d3.stackOffsetNone);
   var data={};
   nest.forEach(function(e){ data[e.key] = e.value; }); 	
   var series=stack([data]);
   //console.log(data, series);
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

function getMutations(protein){
	var mut={
		tp53:'\
		GENE_NAME	CDNA_CHANGE	PROTEIN_CHANGE  \
		braf:' \
		BRAF	c.2295C>T	p.V765V  \
BRAF	c.1852T>C	p.L618L \
BRAF	c.1801A>G	p.K601E \
		pik3ca:'\
		PIK3CA	c.193G>A	p.E65K \
	}
	return mut[protein.toLowerCase()];
}