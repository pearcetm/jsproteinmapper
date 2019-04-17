jsProteinMapper = function(){
	var _this = this;
	var default_opts={
		target:'body',
		pfamData:null, //response from pfam proxy
		variantOfInterest:{},//{codon, annotation[{lable,text},... ] }
		variantTracks:[],//array of objects with properties "label" as name of variant set, and "data" as array of objects with properties "codon", "pdot" and "cdna"
		width:775,
		height:300,
		fontSize:16,
		variantColor:'red',
		lollipopHeight:15,
		lollipopHeadSize:6,
		disulphideBridgeHeightIncrement:0,
		regionHeight:16,
		sequenceHeight:7,
		tracksYOffset:20,
		padding:25,
		trackFillColor:'none',
		showControls:true,
		tooltip:'hover',
	};

	var container,
		proteinlabelcontainer,
 		s,
 		loading, 
 		xscale, 
 		trackscale, 
 		opts, 
 		tracks, 
 		zoom_graphic, 
 		w, 
 		h,
 		lollipopHeight,
 		lollipopHeadSize,
 		regionHeight,
 		sequenceHeight,
 		tracksYOffset,
 		scaleExtentX = 10,
 		scaleExtentY,
 		zoomToSelection=false;
	
	xscale = d3.scaleLinear();
	xscale.scalefactor=1;//use this field to implement cross-element scale clamping
	trackscale = d3.scaleBand();
	
	xaxis_bottom = d3.axisBottom(xscale);
	xaxis_top=d3.axisTop(xscale);
	
	tooltip = d3.tip()
	    .attr('class', 'd3-tip')
	    .offset([-10, 0])
	    .html(function (d) {
	        var div = $('<div>');
	        tooltip.element=div;
	        var m = d.tooltip;
	        if (!m) {
	           return null;
	        }
	        if(m instanceof jQuery) div.append(m.clone());
			else div.append(m);
			div.append($('<div>',{class:'tooltip-close'}) )

	        return div.html();
	    })
	    .direction(function(d){
	    	//var h = tooltip.html();
	    	return 'n';
	    });
	$('body').on('click','.tooltip-close',tooltip.hide );
	
	
	zoom_graphic = d3.zoom()
      .on('zoom', dispatchZoom);
   		
	
	
	_this.init = function(options){
		//Read in options structure and merge with defaults
		opts = $.extend({},default_opts,options);
		
		//copy values to "local" variables for ease of use
		w = opts.width;
	   h = opts.height;	
		lollipopHeight=opts.lollipopHeight;
	   lollipopHeadSize=opts.lollipopHeadSize;
      regionHeight=opts.regionHeight;
      sequenceHeight=opts.sequenceHeight;
      padding=opts.padding,
      tracksYOffset=opts.tracksYOffset;
      
      //set the range of the xscale object
		xscale.range([0,w]);
		
		//clear old widget if needed	
		d3.select(opts.target).select('.jsproteinmapper').remove();
		//create new widget		
		var widgetcontainer=$('<div>',{class:'jsproteinmapper'}).appendTo(opts.target);
		container = $('<div>',{class:'svgcontainer'}).css({width:w,height:h});
		//setup "loading" overlay
		loading=$('<div>',{class:'loading-overlay'}).text('Waiting for data...').appendTo(container);
		//append widget to target element
		container.appendTo(widgetcontainer);
		proteinlabelcontainer = $('<div>',{class:'proteinlabelcontainer'}).appendTo(widgetcontainer);
		
		//create svg element; store reference as variable "s"
		s = d3.select(container.get(0))
			.append('svg')
			.attr('style','box-sizing:border-box; overflow:visible;')
			.attr('width',w)
			.attr('height',h)
			.attr('viewBox','-'+padding+',-'+padding+','+(w+2*padding)+','+(h+2*padding) )
			.call(tooltip);
				
		//Register event handlers to handle zoom/pan behavior
		//Custom handlers first; then selection.call(zoom) to register those handlers later
		
		//mousedown.zoomToSelection event needed to start zoom-to-rectangle behavior
		s.on('mousedown.zoomToSelection',dispatchZoom, true);
		       
	    //now add zoom handlers      
		s.call(zoom_graphic);	
		
		
		//disable text selection to not interfere with zoom/drag behavior
		s.style('-webkit-touch-callout','none')
		.style('-webkit-user-select','none')
		.style('-khtml-user-select','none')
		.style('-moz-user-select','none')
		.style('-ms-user-select','none')
		.style('user-select','none');
		
		
		//Add methods to the public API of the widget
		_this.drawWidget = function(options){
			s.selectAll("*").remove();//clear svg element first
			drawProteinStructure();
			drawVariant();
			drawVariantTracks();
			loading.hide();
		};
		//If these data are not available on initialization of the widget, they can be set later. Returns reference to widget for method chaining.
		_this.setPfamData=function(pfamData){
			opts.pfamData=pfamData;
			return _this;
		}	
		_this.setVariant = function(variant){
			opts.variantOfInterest=variant;
			return _this;
		}
		_this.setTracks = function(track_array){
			opts.variantTracks = track_array;
			return _this;
		}
		
		//return reference to the widget
		return _this;		
	}
	
	//Helper functions for some default implementations of data handling
	//function defs below.
	_this.helpers={
		pfamAjaxResults: pfamAjaxResults,
		parseVariantString: parseVariantString,
		aggregate:aggregate,
		tooltips:{
			basicTooltip:makeBasicTooltip,
			variantTable:variantTable,
			variantPiechart:variantPiechart,
			variantBarchart:variantBarchart,
		},
	}
	
	
	return _this;
	
	//Internal methods
	function drawProteinStructure(){
		var r = opts.pfamData;
		var seq_len = Number(r.length);
		scaleExtentX = seq_len/20;
		
		xscale.domain([0, seq_len]);
		xaxis_bottom.scale(xscale);
		xaxis_top.scale(xscale);
		
		s.append('g').attr('transform','translate(0,'+h+')').attr('class','xaxis bottom').call(xaxis_bottom);
		
		toNumber(r);
		setHeights(r.markups,lollipopHeight,lollipopHeadSize,xscale);
	
		var identifier = r.metadata.identifier;
		var m =identifier.match(/([^_]*).*/i);
		
		if(m && m.length>1) identifier = m[1]; //strip trailing _HUMAN or other underscore-separated text from the identifier
		identifier += ' (' + r.metadata.accession + ':'+r.metadata.database+')';
		proteinlabelcontainer.text(identifier);
		
		var seqc = s.append('g')
			.attr('class','sequence-container')
			.attr('transform','translate(0,'+(h-(lollipopHeight+lollipopHeadSize))+')');
		var seq = seqc.append('g').attr('class','sequence');
		seq.selectAll('.sequence-base')
			.data([{length:r.length,height:opts.sequenceHeight}])
			.enter()
			.append('rect')
			.attr('width',function(d){
				return xscale(d.length)-xscale(0); })
			.attr('height',function(d){
				return d.height})
			.attr('fill','gray')
			.attr('y',function(d){return -1*(d.height/2)})
			.attr('x',xscale(0));
		seq.append('g').attr('class','pfam-regions')
				.selectAll('.pfam-region')
				.data(r.regions)
				.enter()
				.append('path')
				.attr('class','pfam-region has-tooltip')
				.attr('d',function(d){return PfamRegion(d);})
				.attr('fill',function(d){return d.colour;})
				.on('mouseover',tooltip.show)
				.on('mouseout',tooltip.hide);
		
		seqc.append('g').attr('class','pfam-annotations')
			.selectAll('.pfam-annotation')
			.data(r.markups)
			.enter()
			.append(function(d){return makeAnnotation(d); });
			
	}	
	function drawVariant(){
		var d = opts.variantOfInterest;
		if(!d.codon) return;
		var info=Object.assign({},{title:'Variant of interest',Codon:d.codon}, d.annotation);
		d.tooltip = makeBasicTooltip(info);
		s.selectAll('.variant')
			.data([d])
			.enter()
			.append('rect')
			.attr('class','variant has-tooltip')
			.attr('y',0)
			.attr('height',h)
			.attr('x',function(d){ return xscale(d.codon-0.5); })
			.attr('width',function(d){ return Math.max(xscale(1)-xscale(0), 1); })
			.attr('fill',opts.variantColor)
			.attr('stroke','none')
			.on('mouseover',tooltip.show)
			.on('mouseout',tooltip.hide);
		
		
	}
	function drawVariantTracks(){
		tracks = opts.variantTracks;
		var numTracks = tracks.length;
		if (numTracks==0) return;
		s.append('g').attr('class','xaxis top').call(xaxis_top);
		
		var tracks_y = h - (lollipopHeight*2+lollipopHeadSize*2+tracksYOffset);
		
		d3.select('.zoom-x').attr('height',h-tracks_y).attr('y',-1*(tracksYOffset+lollipopHeight+lollipopHeadSize));
		trackscale.domain(tracks.map(function(e,i){ return e.label; }) )
			.range([0, tracks_y])
			.paddingInner(0.1);
		
		for(var i=0;i<numTracks;++i){
			tracks[i].yscalelinear=d3.scaleLinear().range([trackscale.bandwidth(),0]).domain([0,d3.max(tracks[i].data,function(d){return d.count; })*1.1 ]);
			tracks[i].yscalelog=d3.scaleLog().range([trackscale.bandwidth(),0.1]).domain([0.1,d3.max(tracks[i].data,function(d){return d.count; })*1.5 ]);
			tracks[i].yscale=tracks[i].yscalelinear.copy();
			tracks[i].yaxis=d3.axisLeft(tracks[i].yscale).ticks(5,'.0s')
				.tickFormat((v,i,a)=>{
					if(Math.floor(v)!==v || v<1) return;
					if(a.length>10){
						var pow= Math.log10(v);
						//console.log(v,pow,Math.floor(pow));
						if(i!==a.length-1 && Math.floor(pow) !== pow) return;
					}
					return v;
				});
		}
		
		var tracks_container = s.append('g')
			.attr('class','tracks-container');
		
		tracks_container
			.selectAll('.track')
			.data(tracks)
			.enter()
			.append('g')
			.attr('class','track')
			.attr('transform',function(d){return 'translate(0,' + trackscale(d.label) +')'})
			.append('svg') //add svg element to clip the graphs if the scaling or panning overflows
			.attr('width',w)
			.attr('height',trackscale.bandwidth())
			.each(drawHistogram,xscale)
			
		tracks_container.selectAll('.bar')
			.on('mouseover',tooltip.show)
		    .on('mouseout',tooltip.hide);
		   
		//create background rectangles 
		var trackOpacity = 0.5  
		if(opts.trackFillColor == 'none'){
			opts.trackFillColor = 'white';
			trackOpacity = 0.0;
		}
		d3.selectAll('.track')
			.append('rect')
			.attr('width',w)
			.attr('height',function(d){
				return trackscale.bandwidth(); })
			.attr('fill',opts.trackFillColor)
			.attr('fill-opacity',trackOpacity)
			.attr('stroke','gray')
			.lower();
			
		//add text labels
		d3.selectAll('.track')
			.append('text')
			.attr('x',5)
			.attr('y',5)
			.attr('alignment-baseline','hanging')
			.text(function(d){return d.label; });
		
		//add y axes
		d3.selectAll('.track')
			.append('g')
			.attr('class','yaxis').each(function(d){
				d3.select(this).call(d.yaxis); 
			});
		
		var zy = d3.zoom()
			.on('zoom',zoomY2)
			.filter(function(){
				
				if(event.type=='dblclick' || event.type=='touchstart' || (event.type=='wheel'&&(event.shiftKey || event.metaKey)) ){
					return true;
				}
				else{
					var zoom_func = s.on(event.type+'.zoom');
					zoom_func.call(s.node());
					return false;
			}
			
		});

		//Options dialog
		var optionsWindow=$('<div>',{class:'options-window'}).hide().appendTo(container);
		$('<div>',{class:'options-background'}).appendTo(optionsWindow)
			.on('click',()=>optionsWindow.hide());
		var optionsPanel=$('<div>',{class:'options-panel'}).appendTo(optionsWindow);
		$('<div>',{class:'close-button'}).appendTo(optionsPanel).on('click',()=>optionsWindow.hide());
		var optionsDialog=$('<div>',{class:'options-dialog'}).appendTo(optionsPanel);

		//add control buttons
		//options
		var uc=tracks_container.append('foreignObject')
			.attr('class','control-object')
			.attr('width',1)
			.attr('height',1)
			.attr('transform','translate('+(w-1)+',0)')
			.append('xhtml:div')
			.attr('class','user-controls controls');
		
		uc.append('button')
			.attr('class','control-button')
			.text('Options')
			.on('click',()=>{
				optionsWindow.show();
				//$(d3.event.target).toggleClass('active');
				//$(tracks_container.node()).find('.track-controls').toggle()
			});

		var controlOption=$('<div>',{class:'option-item'}).appendTo(optionsDialog);
		$('<span>',{class:'option-text'}).text('Clickable control buttons?').appendTo(controlOption);
		var showControls=$('<button>',{class:'control-button active'}).appendTo(controlOption)
			.text('Show controls')
			.on('click',(ev)=>{
				$(ev.target).toggleClass('active');
				$(tracks_container.node()).find('.track-controls').toggle()
			});

		var tooltipOption=$('<div>',{class:'option-item'}).appendTo(optionsDialog);
		$('<span>',{class:'option-text'}).text('Show tooltip on: ').appendTo(tooltipOption);
		var tooltipHover=$('<button>',{class:'control-button tooltip-hover active'}).appendTo(tooltipOption)
			.text('Hover')
			.on('click',()=>{
				optionsDialog.find('.tooltip-click').removeClass('active')
				optionsDialog.find('.tooltip-hover').addClass('active')
				container.addClass('tooltip-hover')
					.removeClass('tooltip-click')
				d3.select(tooltip.node())
					.classed('tooltip-hover',true)
					.classed('tooltip-click',false)
				d3.selectAll('.has-tooltip')
					.on('mouseover',tooltip.show)
					.on('mouseout',tooltip.hide)
					.on('click',null)
			});
		var tooltipClick=$('<button>',{class:'control-button tooltip-click'}).appendTo(tooltipOption)
			.text('Click')
			.on('click',()=>{
				optionsDialog.find('.tooltip-hover').removeClass('active')
				optionsDialog.find('.tooltip-click').addClass('active')
				container.addClass('tooltip-click')
					.removeClass('tooltip-hover')
				d3.select(tooltip.node())
					.classed('tooltip-hover',false)
					.classed('tooltip-click',true)
				d3.selectAll('.has-tooltip')
					.on('mouseover',null)
					.on('mouseout',null)
					.on('click',tooltip.show)
			});

		//track-specific controls
		//zoom controls
		var zc = tracks_container.selectAll('.track svg')
			.append('foreignObject')
			.attr('class','control-object')
			.attr('width',1)
			.attr('height',1)
			.attr('transform','translate('+(w-1)+',0)')
			.append('xhtml:div')
			.attr('class','track-controls zoom-controls controls')


		zc.append('button')
			.attr('class','zoom-in control-button')
			.text('+')
			.on('click',()=>{
				d3.select($(d3.event.target).closest('.track')[0]).call(zy.scaleBy, 1.5)
			})
		var mid=zc.append('div').attr('class','mid');
		mid.append('button')
			.attr('class','control-button')
			.text('<')
			.on('click',()=>{
				s.call(zoom_graphic.scaleBy,1/1.5);
			});
		mid.append('button')
			.attr('class','control-button')
			.text('x')
			.on('click',()=>{
				s.call(zoom_graphic.transform,d3.zoomIdentity);
				$(d3.event.target).closest('.track').find('.scale.active').click();
			});
		mid.append('button')
			.attr('class','control-button')
			.text('>')
			.on('click',()=>{
				s.call(zoom_graphic.scaleBy,1.5);
			});
		zc.append('button')
			.attr('class','zoom-out control-button')
			.text('-')
			.on('click',()=>{
				d3.select($(d3.event.target).closest('.track')[0]).call(zy.scaleBy, 1/1.5)
			})

		//axis controls
		var ac = tracks_container.selectAll('.track')
			.append('foreignObject')
			.attr('class','control-object')
			.attr('width',1)
			.attr('height',1)
			.attr('transform','rotate(-90)')
			.append('xhtml:div')
			.attr('class','track-controls axis-controls controls')
			.style('width',Math.floor(trackscale.bandwidth())+'px');

		ac.append('button')
			.attr('class','scale scale-linear control-button active')
			.text('linear')
			.on('click',linearScale);
		ac.append('button')
			.attr('class','scale control-button scale-log')
			.text('log')
			.on('click',logScale);

		//attach the zoom handler to the data
		tracks.forEach(function(e){e.zoom = zy;});
		//add zoom event handlers
		d3.selectAll('.track')
			.call(zy);

		//Handle user options for controls and tooltip
		if(opts.showControls==false) showControls.click();
		if(opts.tooltip=='click') tooltipClick.click();
		else tooltipHover.click();
	}
	
	function drawHistogram(track){
		var yscale = track.yscale;
		var width = Math.max(xscale(1)-xscale(0), 1);
		
		d3.select(this)
			.selectAll('.bar')
			.data(track.data)
			.enter()
			.append('g')
			.attr('class','bar bar-x has-tooltip')
			.attr('transform',(d)=>'translate('+xscale(d.codon-0.5)+',0)')
			.append('g')
			.attr('transform','translate(0,'+yscale.range()[0]+')')
			.append('g')
			.attr('class','bar-scale-x')
			.attr('transform','scale('+width+',1)')
			.append('g')
			.attr('class','bar-scale-y')
			.attr('transform','scale(1,-1)')
			.selectAll('.track-item')
			.data((d)=>{
				var data={
					yscale:(val)=>yscale.range()[0]-yscale(Math.max(val,yscale.domain()[0])),
					d:d
				}
				return [data];
			})
			.enter()
			.append('g')
			.attr('class','track-item')
			.call(drawTrackItem)

		
	}
	function drawTrackItem(p){
		p.each(function(d){
			var g=d3.select(this);
			g.selectAll('*').remove();
			var draw = d.d.drawTrackItem ? d.d.drawTrackItem : defaultBar;
			var y=d.yscale;
			var data=d.d;
			g.datum(data);
			draw(g,d.yscale);
		})
	}
	function defaultBar(g,y){
		g.append('rect')
			.attr('class','redraw')
			.attr('height',(d)=>y(d.count))
			.attr('width',1)
			.attr('fill',(d)=>d.color?d.color:'black')
			.datum((d)=>{d.redraw=redraw;return d;})
		function redraw(el,y){
			el.attr('height',(d)=>y(d.count))
		}
	}
	
	function dispatchZoom(){
		
		//Dispatch to different event handlers depending on context of event
		//Modifier keys: shift, ctrl
		//Wheel (no-modifier):X-xoom
		//Mod-wheel on trackgroup: Y-zoom
		//Dblclick on trackgroup: Y-zoom
		//Dblclick on background/protein graphic: X-zoom
		//Drag (no-mod): X-pan
		//Mod-drag: Begin selection rectangle, and zoom depending on context. Initiated in other handler (above)
			
		
		switch(d3.event.type){
			
			case 'mousedown':
				var evt = event ||d3.event;
				if(evt.shiftKey || evt.metaKey){
					
					evt.path = evt.path || [];
					var trackgroup =evt.path.find(function(e){ return /\btrack\b/.test(e.classList); });
		
					zoomToSelection={};
					zoomToSelection.point1 = d3.mouse(s.node());
					zoomToSelection.trackgroup=trackgroup;
				   
				   
				   if(trackgroup){
				   		var tg=d3.select(trackgroup);
				   		zoomToSelection.point1[1]=trackscale.bandwidth();
				      zoomToSelection.ylim=[0, trackscale.bandwidth()];
						zoomToSelection.zoomrect = tg.append("rect").attr("class", "zoom-rect").attr('stroke','black').attr('fill-opacity',0.4).attr('fill','white');
				   }
			      else{
			      		zoomToSelection.point1[1]=h;
			      		zoomToSelection.zoomrect = s.append("rect").attr("class", "zoom-rect").attr('stroke','black').attr('fill-opacity',0.4).attr('fill','white');
			      }
			      
			      d3.event.stopImmediatePropagation();
			      d3.select(window)
			          .on("mousemove.zoomToSelection", dispatchZoom, true)
			          .on("mouseup.zoomToSelection", dispatchZoom, true);
			   }
		    	break;
		   case 'mousemove':
		      if(zoomToSelection){
			      
	            if(zoomToSelection.trackgroup){
	            		//Zoom in X and Y: limit the selection rect to the trackgroup only
	            		var m = d3.mouse(zoomToSelection.trackgroup);
	            		m[1] = Math.max(0, m[1]);
	            		if(m[1]  >= zoomToSelection.ylim[1]) m[1]=0;
	            }
	            else{
	            		//Zooming in X only: make the selection rect the entire height of the svg element
	            		var m = d3.mouse(s.node());
	            		m[1] = 0;
	            }
	            m[0] = Math.max(0, Math.min(w, m[0]));
	            
	            var point1 = zoomToSelection.point1;
	            zoomToSelection.zoomrect.attr("x", Math.min(point1[0], m[0]))
	                .attr("y", Math.min(point1[1], m[1]))
	                .attr("width", Math.abs(m[0] - point1[0]))
	                .attr("height", Math.abs(m[1] - point1[1]));
	            d3.event.stopImmediatePropagation();
		      }
            break;
          case 'mouseup':
          	if(zoomToSelection){
          		d3.select(window)
			          .on("mousemove.zoomToSelection",null)
			          .on("mouseup.zoomToSelection",null);
	            var point2 = d3.mouse(s.node());
	            var point1=zoomToSelection.point1;
	            if (point2[0] !== point1[0] ) {
	              var x1=Math.min(point1[0], point2[0]);
	              var x2=Math.max(point1[0],point2[0]);
	              
		            if(zoomToSelection.trackgroup){
		            		//zoom to Y range
		            		var tg=d3.select(zoomToSelection.trackgroup);
		            		var d =tg .datum(); //get trackgroup's data
		            		var multiplier=zoomToSelection.ylim[1] / zoomToSelection.zoomrect.attr('height');
		            		tg.transition().duration(300).call(d.zoom.scaleBy, multiplier );
		            		
		            }
		            
		            //zoom to x range in all cases
		            //get the current zoom transform for the svg node
		            var zt = d3.zoomTransform(s.node());
		            s.transition()
		            		.duration(300)
		            		.call(zoom_graphic.transform,
		            		 	d3.zoomIdentity
		            				.scale( zt.k * w/(x2-x1) )
						      		.translate( -zt.invertX(x1), 0) );
		            
	            }
	            zoomToSelection.zoomrect.remove();
	            zoomToSelection=false;
	            
	            d3.event.stopImmediatePropagation();
          	}
            break;
          case 'zoom':
          	zoomX();
          	break;
			default: 
				zoomX();
		}
		
	}
	
	
	function zoomX(){
		transform = d3.event.transform;
		if(!transform) transform = d3.zoomIdentity;
		
		var newX = transform.rescaleX(xscale);
		
		d3.select('.sequence').attr('transform', 'translate(' + transform.x + ',' + 0 + ') scale(' + transform.k + ',1)');
		d3.selectAll('.annotation.disulphide').attr('transform', function(d){
			 return 'translate(' + newX(d.start) +',' + 0 + ') scale(' + transform.k + ',1)';
		});
		d3.selectAll('.annotation.lollipop').attr('transform', function(d){ 
			return 'translate(' + newX(d.start) +',' + 0 + ')';
		});
		
		xaxis_bottom.scale(newX);
		xaxis_top.scale(newX);
		d3.selectAll('.xaxis.bottom').call(xaxis_bottom);
		d3.selectAll('.xaxis.top').call(xaxis_top);
		
		d3.selectAll('.variant')
			.attr('x',function(d){ return newX(d.codon-0.5); })
			.attr('width',function(d){ return Math.max(newX(1)-newX(0), 1); });
		
		d3.selectAll('.bar-x')
			.attr('transform',(d)=>{
				return 'translate('+newX(d.codon-0.5)+',0)'
				//return 'translate('+(newX(d.codon)-Math.max(newX(0.5)-newX(0), 0.5))+',0)'
			}).select('.bar-scale-x')
			.attr('transform',(d)=>{
				return 'scale('+Math.max(newX(1)-newX(0), 1)+',1)';
			});

		// d3.selectAll('.bar')
		// 	.attr('x',function(d){ return newX(d.codon)-Math.max(newX(0.5)-newX(0), 0.5); })
		// 	.attr('width',function(d){
		// 		return Math.max(1, newX(1)-newX(0)); });
		
	}
	
	function zoomY2(d){
		drawY(this,d)	
	}
	function drawY(track,d,opt){
		var track=d3.select(track);
		//var y = d.yscale;//.copy();
		var y = d.yscale.copy();
		var domain=d.yscale.domain();
		
		if(d3.event.transform){
			domain[1]=domain[1] / d3.event.transform.k;
		}
		else if(opt){
			switch(opt){
				case 'in':domain[1]*=2; break;
				case 'out':domain[1]*=0.5;break;
				case 'reset':track.call(d.zoom.transform, d3.zoomIdentity);break;
			}
		}
		if(domain[1]<=1){
			track.call(d.zoom.transform, d3.zoomIdentity);
			return;
		}
		y.domain(domain);
		var zoom_factor=d.yscale.domain()[1]/domain[1];
		
		track.selectAll('.track-item .redraw')
			.each(function(d){
				d.redraw(d3.select(this),(c)=>y.range()[0]-y(Math.max(c,y.domain()[0])) )
			})

		d.yaxis.scale(y);
		track.select('.yaxis').call(d.yaxis);
	}
	
	function logScale(d){
		console.log('log');
		var button=$(this);
		button.addClass('active');
		var track=button.closest('.track');
		button.closest('.track-controls').find('.scale-linear').removeClass('active');
		d.yscale = d.yscalelog;

		drawY(track[0],d,'reset');
	}
	function linearScale(d){
		console.log('linear');
		var button=$(this);
		button.addClass('active');
		var track=button.closest('.track');
		button.closest('.track-controls').find('.scale-log').removeClass('active');
		d.yscale = d.yscalelinear;

		drawY(track[0],d,'reset');
	}
	
	
	function makeAnnotation(e){
		var lollipopHeight=opts.lollipopHeight,
	      lollipopHeadSize=opts.lollipopHeadSize;
		var g = d3.select(document.createElementNS(d3.namespaces.svg, 'g'));
		var ys = e.v_align=="bottom"? 1 : -1;
		switch(e.type){
			case 'disulphide':
				console.log('disulphide');
				var color=e.colour;
				var lineColor=e.lineColour;
				g.append('path')
					.attr('d','M'+0+','+0+',v'+(e.height*ys)+',H'+xscale(e.end-e.start)+'V0')
					.attr('stroke',lineColor)
					.attr('fill','none');
				g.classed('disulphide',true)
					.attr('transform','translate(' + xscale(e.start) + ',0)');
				var tt=makeBasicTooltip({title:'Annotation',Description:e.metadata.type,Span:e.metadata.start+' - '+e.metadata.end,Source:e.metadata.database});
				break;
			default:
				var color=e.colour;
				var lineColor=e.lineColour;
				if(e.headStyle=='arrow'||e.headStyle=='pointer'||e.headStyle=='line') var strokeWidth=2;
				else var strokeWidth=0;
				g.append('path')
					.attr('d','M'+0+','+0+',v'+(e.height*ys))
					.attr('stroke',lineColor);
				g.append('path')
					.attr('d',PfamLollipopHead(0,ys*e.height,e.headStyle,lollipopHeadSize))
					.attr('fill',color)
					.attr('stroke',color)
					.attr('strokeWidth',strokeWidth);
				g.classed('lollipop',true)
					.attr('transform','translate(' + xscale(e.start) + ',0)');
				var tt=makeBasicTooltip({title:'Annotation',Description:e.metadata.description,Location:e.metadata.start,Source:e.metadata.database});		
				console.log(e.type);
				break;	
		}
		e.tooltip = tt;
		g.classed('annotation scalable has-tooltip',true)
					.on('mouseover',tooltip.show)
				   .on('mouseout',tooltip.hide);
		
		return g.node();
	}
	
	function PfamRegion(r){
		var x = xscale(Number(r.start));
		var y = 0;
		var w = xscale(r.end-r.start);
		var h = opts.regionHeight;
		var endLeft = r.endStyle;
		var endRight = r.endStyle;
		var s='M'+x+','+y;
		var ry=h/2, rx=Math.min(h/2, w/2);
		switch(endLeft){
			case 'curved': s+='a'+rx+','+ry+',0,0,1,'+rx+','+(-ry);break;
			case 'jagged': s+='l'+(rx/2)+','+(-ry/2)+','+(-rx/2)+','+(-ry/2);break;
			case 'straight': s+='v'+(-ry); break;
			case 'arrow': s+='l'+rx+','+(-ry); break;
		}
		switch(endRight){
			case 'curved': s+='H'+(x+w-rx)+'a'+rx+','+ry+',0,0,1'+0+','+(2*ry);break;
			case 'jagged': s+='H'+(x+w)+'l'+(-rx/2)+','+(ry/2)+','+(rx/2)+','+(ry/2)+','+(-rx/2)+','+(ry/2)+','+(rx/2)+','+(ry/2);break;
			case 'straight': s+='H'+(x+w)+'v'+(2*ry); break;
			case 'arrow': s+='l'+rx+','+ry+','+(-rx)+','+ry; break;
		}
		switch(endLeft){
			case 'curved': s+='H'+(x+rx)+'a'+rx+','+ry+',0,0,1,'+(-rx)+','+(-ry);break;
			case 'jagged': s+='H'+(x)+'l'+(rx/2)+','+(-ry/2)+','+(-rx/2)+','+(-ry/2);break;
			case 'straight': s+='H'+(x)+'v'+(-ry); break;
			case 'arrow': s+='l'+(-rx)+','+(-ry); break;
		}
		return s;
	}

	function PfamLollipopHead(cx,cy,type,diameter){
		var r=diameter/2;
		var s='M'+cx+','+cy;		
		switch(type){
			case 'diamond': s+='m0,'+r+'l'+r+',-'+r+',-'+r+',-'+r+',-'+r+','+r+',z'; break;
			case 'square': s+='m'+r+','+2+'v-'+diameter+',h-'+diameter+'v'+diameter+'z'; break;
			case 'circle': s+='m0,-'+r+'a'+r+','+r+',0,1,1,0,'+diameter+'a'+r+','+r+',0,1,1,0,-'+diameter;break;
			case 'arrow': s+='l'+r+','+r+',-'+r+',-'+r+',-'+r+','+r+','+r+',-'+r;break;
			case 'pointer': s+='m0,'+(-1*cy)+'l'+r+',-'+r+',-'+r+','+r+',-'+r+',-'+r+','+r+','+r;break;
			case 'line': s+='m0,'+diameter+'v-'+(3*diameter); break;
		}
		return s;
	}
	
	
	function setHeights(r,h,hs,s){
		//set lollipop heights
		var l=r.filter(function(a){return a.type!='disulphide';});
		for(var i=0;i<l.length;++i){
			l[i].height=h;
		}
		
		//set disulphide bridge heights
		var d=r.filter(function(a){return a.type=='disulphide';});
		d.sort(function(a,b){return a.start-b.start;});
		var increment=opts.disulphideBridgeHeightIncrement;
		for(var i=0;i<d.length;++i){
			var prev=d.slice(0,i);
			var ok=false;
			var _this=d[i];
			_this.height=h;
			while(!ok && opts.disulphideBridgeHeightIncrement){
				var collisions=prev.filter(function(e){
					return _this.height==e.height && !( (e.start<_this.start&&e.end<_this.start) || (e.start>_this.end&&e.end>_this.end) ); 
				});
				collisions.length==0?ok=true:_this.height+=increment; 
			}
		}
	}
	function toNumber(r){
		var f=['regions','motifs','markups'];
		var n=['start','end','aliStart','aliEnd'];
		for(var i=0;i<f.length;++i)
			for(var c=0;c<r[f[i]].length;++c)	
				for(var j=0;j<n.length;++j) 
					r[f[i]][c][n[j]]=Number(r[f[i]][c][n[j]]);
		
	}
	
	//Helpers - functions to perform useful tasks, exposed in the API
	function pfamAjaxResults(callback){
		function f(data,textStatus,jqXHR){		
			var response = data;
			if(typeof(data)=="string") response=JSON.parse(response);
			var r = response[0];
			$.each(r.regions,function(i,e){
				var tt=makeBasicTooltip({
					title:'Region: '+e.metadata.identifier+' ('+e.metadata.accession+')',
					Description:e.metadata.description,
					Coordinates:e.metadata.start+' - '+e.metadata.end+' (alignment region '+e.metadata.aliStart+' - '+e.metadata.aliEnd+')',
					Source:e.metadata.database
				});
				e.tooltip = tt;
			});
			callback(r);
		}
		return f;
	};	
	function parseVariantString(geneName, variants){
		m = variants.trim().split(/\s+/);
		vArr = [];
		for(ii=0;ii<m.length-2;ii+=3){
			var gene=m[ii];
			var cdna=m[ii+1];
			var prot=m[ii+2];
			if(!gene || !prot || !cdna) continue;
			var codon = prot.match(/p.[a-zA-Z](\d+)/);
			if(gene.toLowerCase() == geneName.toLowerCase() && codon){
				vArr.push({
					codon: codon[1],
					pdot:prot,
					cdna:cdna
				});
			}
			
		}
		
		return vArr;
	}
	function aggregate(variants, tooltipGenerator){
		var m = d3.nest()
			.key(function(d){return d.codon; })
			.map(variants);
		var nest = d3.nest()
			.key(function(d){return d.codon; })
			.key(function(d){return d.pdot; })
			.entries(variants);
		var arr=nest.map(function(e,i){
			var parseAlteration=e.values[0].key.match(/(p\.\S\d+)/);
			var wt=parseAlteration[0];
			var wt_aa = wt.substr(2,1).toLowerCase();
			var mut = {
					codon:e.key,
					count:m.get(e.key).filter(function(d){return d.pdot.slice(wt.length).toLowerCase() != wt_aa; }).length,
					wildtype:wt
				};
			var alterations = e.values.map(function(e){
				var m = e.key.match(/p\.\S\d+(.*)/);
				var l = m[1];
				if(l.length>=2 && l.substring(0,2)=="fs") l = 'fs';
				else if(l.length>=2) l='in-frame';
				
				return {
					label:l,
					count:e.values.length
				};
			}).filter(function(d){ return d.label.toLowerCase() != wt_aa; });
			
			var nest=d3.nest()
				.key(function(d){return d.label; })
				.rollup(function(leaves){
					return d3.sum(leaves,function(d){
						return d.count;
						})
				 })
				.entries(alterations);
			nest=nest.sort(function(a,b){
					if(a.key=='other') {
						return 1;
					}
					return b.value  - a.value;
				});
			mut.nestedAlterations = nest;
			
			if (tooltipGenerator) mut.tooltip = tooltipGenerator( mut);
			return mut;
		});
		
		
		
	return arr;
	}
	//makeBasicTooltip expects an object with a "title" field. Other fields are added to a table, with fieldname as label and value as text
	function makeBasicTooltip(obj){
		var title=obj.title;
		var d=obj;
		delete d.title;
		var el=$('<div>').css({border:'thin black solid',backgroundColor:'white',padding:'0.2em',display:'inline-block'});
		var table=$('<table>').append($('<tr><th colspan=2 align="left">'+title+'</th></tr>')).appendTo(el);
		$.each(d,function(name,value){table.append($('<tr><td>'+name+': </td><td>'+value+'</td></tr>'));});
		return el;
	}
	
	
	//variantTable takes the results of a map operation on a nest
	//expects codon number to be the key
	function variantTable(mut){
		var e = mut.nestedAlterations; //this is probably broken!
		var ttinfo={
			title:'Codon '+mut.wildtype,
			'# of variants':mut.count,
			'Distinct protein changes':e.length,
			};
		var v = e.sort(function(a,b){
			return b.length - a.length; });
		if(v.length>5){
			for(var i=0;i<4;++i){
				var el=v[i];
				var alt = '- ' + el.key;
				ttinfo[alt] = el.value==1? el.value + ' occurrence' : el.value + ' occurrences';
			}
			ttinfo['Others'] = (v.length-4) +'('+ d3.sum(v.slice(4),function(d){ return d.value;}) +' total)';
		}
		else{
			for(var i=0;i<v.length;++i){
				var el=v[i];
				var alt = '- ' + el.key;
				ttinfo[alt] = el.value==1? el.value + ' occurrence' : el.value + ' occurrences';
			}
		}
		var tt=makeBasicTooltip(ttinfo);
		return tt;	
	}
	function variantPiechart(mut){
		var tt = $('<div>').css({border:'thin black solid',backgroundColor:'white',padding:'0.2em',display:'inline-block','text-align':'center'});
		
		var nest = mut.nestedAlterations;	
		
		var dt = d3.select(tt[0]);
		dt.append('h4').text(mut.wildtype+': '+mut.count+' variants reported');
		var svg = dt.append('svg')
			.attr('width',260)
			.attr('height',160)
			.style('overflow','visible');
		var pie = d3.pie().value(function(d){ return d.value; }).sortValues(null);
		var arc = d3.arc()
			.outerRadius(60)
			.innerRadius(0);
		var label = d3.arc()
			.outerRadius(75)
			.innerRadius(75);
		var piechart = svg.append('g')
			.attr('class','piechart')
			.attr('transform','translate(130,80)');
		var wedges = piechart.selectAll('.alteration')
			.data(pie(nest))
			.enter()
			.append('g')
			.attr('class','alteration');
		wedges.append('path')
			.attr('d',arc)
			.attr("fill", function(d) {
				var colorIndex=d.index % 10; 
				return d3.schemeCategory10[colorIndex];
			 });
		wedges.append('text')
			.attr("transform", function(d) { 
				return "translate(" + label.centroid(d) + ")"; })
	      .attr("dy", "0.35em")
	      .attr('text-anchor','middle')
	      .text(function(d) { 
	      		var pct = Math.round(100*d.data.value/mut.count);
	      		var label=''+d.data.key;
	      		if (d.index<3) label += ' ('+pct+'%)';
	      		return label;
	      	});
			
			
		return tt;
	}
	function variantBarchart(mut){
		var tt = $('<div>',{class:'tooltip-contents'}).css({border:'thin black solid',backgroundColor:'white','text-align':'center'});
		
		var dt = d3.select(tt[0]);
		dt.append('h3').text(mut.wildtype+': '+mut.count+' alterations reported');
		
		var nest = mut.nestedAlterations;	
		var width = 160;
		var height = nest.length * 20;//20px per bar
		var total = d3.sum(nest, function(e){return e.value; });
		
		var keys = 	nest.map(function(e){return e.key; }) ;
	   var y = d3.scaleBand()
	   		.domain(keys)
			.rangeRound([0, height], .1)
			.paddingInner(0.1);

		var x = d3.scaleLinear()
			.domain([0, 1])
		   .range([0, width]);


		var yAxis = d3.axisLeft()
      		.scale(y);
      		
	   
	   	var margin = {top: 0, right: 50, bottom: 0, left: 80};
	   	var svg = dt.append('svg')
			.attr('width',width+margin.left+margin.right)
			.attr('height',height+margin.top+margin.bottom)
			.append('g')
			.attr('transform','translate('+margin.left+','+margin.top+')');
	   	svg.selectAll('.rect')
	   		.data(nest)
	   		.enter()
	   		.append('rect')
	   		.attr('x',0)
	   		.attr('width',function(d){ 
	   			return x(d.value / total); })
	   		.attr('y',function(d){
	   			return y(d.key); })
	   		.attr('height',y.bandwidth())
	   		.attr("fill", function(d,i) {
					var colorIndex=i%10;//d.value % 10; 
					return d3.schemeCategory10[colorIndex];
				 });
	   	svg.selectAll('.aaname')
	   		.data(nest)
	   		.enter()
	   		.append('text')
	   		.attr('class','aaname')
	   		.attr('x',0)
	   		.attr('text-anchor','end')
	   		.attr('alignment-baseline','middle')
	   		.attr('y',function(d){
	   			return y(d.key)+y.bandwidth()/2; })
	   		.attr('dx','-0.2em')
	   		.text(function(d){return d.key; });
	   	
	   	svg.selectAll('.aapct')
	   		.data(nest)
	   		.enter()
	   		.append('text')
	   		.attr('class','aapct')
	   		.attr('x',function(d){
	   			return x(d.value / total); })
	   		.attr('text-anchor','start')
	   		.attr('alignment-baseline','middle')
	   		.attr('y',function(d){
	   			return y(d.key)+y.bandwidth()/2; })
	   		.attr('dx','0.2em')
	   		.text(function(d){
	   			return ''+Math.round(100*d.value/ total)+'%'; });
			
		return tt;
	}
	function variantBarchart2(mut, el){
		var tt = $('<div>').css({border:'thin black solid',backgroundColor:'white',padding:'0.2em',display:'inline-block','text-align':'center'});
		
		var nest = mut.nestedAlterations;	
			
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
};

