jsProteinMapper = function(){
	var _this = this;
	var default_opts={
		target:'body',
		pfamData:null, //response from pfam proxy
		mutation:{},//{codon, annotation[{lable,text},... ] }
		mutationTracks:[],//array of struct with key as name of mutation set and value as string of mutations
		parentSelector:null,
		width:775,
		height:300,
		fontSize:16,
		mutationColor:'red',
		lollipopHeight:15,
		lollipopHeadSize:6,
		disulphideBridgeHeightIncrement:0,
		regionHeight:16,
		sequenceHeight:7,
		tracksYOffset:20,
		padding:25,
		trackFillColor:'none'
	};

	var container,
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
	        var m = d.tooltip;
	        if (!m) {
	           return null;
	        }
	        if(m instanceof jQuery) div.append(m.clone());
			 else	div.append(m);
	        return div.html();
	    })
	    .direction(function(d){
	    	var h = tooltip.html();
	    	//console.log(d,this,$(h).height());
	    	return 'n';
	    });
	/*tooltip.hide = function(){
		var nodel = d3.select('.d3-tip');
      var bb=nodel.node().getBoundingClientRect();
      var mx=event.clientX,
            my=event.clientY;
      if(mx<bb.left || mx>bb.right || my<bb.top || my>bb.bottom){
      		nodel.style('opacity', 0).style('pointer-events', 'none')
      }
      
      return tooltip;
	}*/
	
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
		d3.select('.jsproteinmapper').remove();
		//create new widget		
		container=$('<div>',{class:'jsproteinmapper'})
			.css({width:w,height:h,position:'relative',overflow:'hidden','box-sizing':'border-box'});
		//setup "loading" overlay
		loading=$('<div>').css({position:'absolute',top:0,left:0,right:0,bottom:0,zIndex:101,backgroundColor:'white',textAlign:'center','box-sizing':'border-box'})
			.text('Waiting for data...').appendTo(container);
		//append widget to target element
		container.appendTo(opts.target);
		
		//create svg element; store reference as variable "s"
		s = d3.select(container.get(0))
			.append('svg')
			.attr('style','box-sizing:border-box; overflow:visible;')
			.attr('width',w)
			.attr('height',h)
			.attr('viewBox','-'+padding+',-'+padding+','+(w+2*padding)+','+(h+2*padding) )
			.call(tooltip);
			
		//now that the tooltip has been "called", setup the mouseout event handler	
		d3.select('.d3-tip').on('mouseout',tooltip.hide );
			
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
			drawMutation();
			drawMutationTracks();
			loading.hide();
		};
		//If these data are not available on initialization of the widget, they can be set later. Returns reference to widget for method chaining.
		_this.setPfamData=function(pfamData){
			opts.pfamData=pfamData;
			return _this;
		}	
		_this.setMutation = function(mutation){
			opts.mutation=mutation;
			return _this;
		}
		_this.setTracks = function(track_array){
			opts.mutationTracks = track_array;
			return _this;
		}
		
		//return reference to the widget
		return _this;		
	}
	
	//Helper functions for some default implementations of data handling
	//function defs below.
	_this.helpers={
		pfamAjaxResults: pfamAjaxResults,
		parseMutationString: parseMutationString,
		aggregate:aggregate,
		tooltips:{
			basicTooltip:makeBasicTooltip,
			mutationTable:mutationTable,
			mutationPiechart:mutationPiechart,
			mutationBarchart:mutationBarchart,
		},
	}
	
	
	return _this;
	
	//Internal methods
	function drawProteinStructure(){
		var r = opts.pfamData;
		var seq_len = Number(r.length);
		scaleExtentX = seq_len/20;
		
		xscale.domain([0, seq_len]);
		s.append('g').attr('transform','translate(0,'+h+')').attr('class','xaxis bottom').call(xaxis_bottom);
		
		toNumber(r);
		setHeights(r.markups,lollipopHeight,lollipopHeadSize,xscale);
	
			
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
				.attr('class','pfam-region')
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
	function drawMutation(){
		var d = opts.mutation;
		if(!d.codon) return;
		var info=Object.assign({},{title:'Variant of interest',Codon:d.codon}, d.annotation);
		d.tooltip = makeBasicTooltip(info);
		s.selectAll('.mutation')
			.data([d])
			.enter()
			.append('rect')
			.attr('class','mutation')
			.attr('y',0)
			.attr('height',h)
			.attr('x',function(d){ return xscale(d.codon); })
			.attr('width',function(d){ return Math.max(xscale(1)-xscale(0), 1); })
			.attr('fill',opts.mutationColor)
			.attr('stroke','none')
			.on('mouseover',tooltip.show)
			.on('mouseout',tooltip.hide);
		
		
	}
	function drawMutationTracks(){
		tracks = opts.mutationTracks;
		var numTracks = tracks.length;
		if (numTracks==0) return;
		s.append('g').attr('class','xaxis top').call(xaxis_top);
		
		var tracks_y = h - (lollipopHeight*2+lollipopHeadSize*2+tracksYOffset);
		
		d3.select('.zoom-x').attr('height',h-tracks_y).attr('y',-1*(tracksYOffset+lollipopHeight+lollipopHeadSize));
		trackscale.domain(tracks.map(function(e,i){ return e.label; }) )
			.range([0, tracks_y])
			.paddingInner(0.1);
		
		for(var i=0;i<numTracks;++i){
			tracks[i].yscale=d3.scaleLinear().range([trackscale.bandwidth(), 0]).domain([0,d3.max(tracks[i].data,function(d){return d.count; })*1.1 ]);
			tracks[i].yaxis=d3.axisLeft(tracks[i].yscale).tickArguments([Math.ceil(trackscale.bandwidth()/15)]);
			tracks[i].yscale.scale_factor=1;
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
			.attr('height',function(d){return trackscale.bandwidth(); })
			.selectAll('.bar')
			.data(function(d){
				return d.data;})
			.enter()
			.append('rect')
			.attr('class','bar')
			.attr('x',function(d){
				return xscale(d.codon); })
			.attr('y',function(d){
				return d3.select(this.parentNode).datum().yscale(d.count); })
			.attr('height',function(d){
				var ys=d3.select(this.parentNode).datum().yscale;
				return ys(0)-ys(d.count); })
			.attr('width',function(d){
				return Math.max(xscale(1)-xscale(0), 1); })	
			.on('mouseover',tooltip.show)
		   .on('mouseout',tooltip.hide);
		   
		//create background rectangles   
		d3.selectAll('.track')
			.append('rect')
			.attr('width',w)
			.attr('height',function(d){
				return trackscale.bandwidth(); })
			.attr('fill',opts.trackFillColor)
			.attr('fill-opacity',0.5)
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
					//console.log('dispatching ',event.type, event);
					zoom_func.call(s.node());
					return false;
			}
			
		});
		//attach the zoom handler to the data
		tracks.forEach(function(e){e.zoom = zy;});
		//add zoom event handlers
		d3.selectAll('.track')
			.call(zy);	
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
		
		d3.selectAll('.mutation')
			.attr('x',function(d){ return newX(d.codon)-Math.max(newX(0.5)-newX(0), 0.5); })
			.attr('width',function(d){ return Math.max(newX(1)-newX(0), 1); });
			
		d3.selectAll('.bar')
			.attr('x',function(d){ return newX(d.codon)-Math.max(newX(0.5)-newX(0), 0.5); })
			.attr('width',function(d){
				return Math.max(1, newX(1)-newX(0)); });
		
	}
	
	function zoomY2(d){
		
		var track = d3.select(this);
		var y = d.yscale.copy();
		var domain=d.yscale.domain();
		
		
		domain[1]=domain[1] / d3.event.transform.k;
		if(domain[1]<=1){
			track.call(d.zoom.transform, d3.zoomIdentity);
			return;
		}
		y.domain(domain);
		
		d.yaxis.scale(y);
		track.select('.yaxis').call(d.yaxis);
		track.selectAll('.bar')
			.attr('y',function(d){ return y(d.count); })
			.attr('height',function(d){ return y(0)-y(d.count); });
			
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
		g.classed('annotation scalable',true)
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
			while(!ok){
				var collisions=prev.filter(function(e){
					return _this.height==e.height && !( (e.start<_this.start&&e.end<_this.start) || (e.start>_this.end&&e.end>_this.end) ); });
					collisions.length==0?ok=true:_this.height+=increment; }
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
			var response=JSON.parse(data);
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
	function parseMutationString(geneName, mutations){
		m = mutations.split(/\s+/);
		mut = [];
		for(ii=1;ii<m.length;ii+=3){
			var gene=m[ii];
			var cdna=m[ii+1];
			var prot=m[ii+2];
			var codon = prot.match(/p.[a-zA-Z](\d+)/);
			if(gene.toLowerCase() == geneName.toLowerCase()){
				mut.push({
					codon: codon[1],
					pdot:prot,
					cdna:cdna
				});
			}
			
		}
		
		return mut;
	}
	function aggregate(mutations, tooltipGenerator){
		var m = d3.nest()
			.key(function(d){return d.codon; })
			.map(mutations);
		var nest = d3.nest()
			.key(function(d){return d.codon; })
			.key(function(d){return d.pdot; })
			.key(function(d){return d.cdna; })
			.entries(mutations);
		var arr=nest.map(function(e,i){
			var parseAlteration=e.values[0].key.match(/(p\.\S\d+)/);
			var wt=parseAlteration[0];
			var mut = {
					codon:e.key,
					count:m.get(e.key).length,
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
			});
			
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
	
	
	//mutationTable takes the results of a map operation on a nest
	//expects codon number to be the key
	function mutationTable(mut){
		var e = mut.nestedAlterations; //this is probably broken!
		var ttinfo={
			title:'Codon '+mut.codon,
			'# of mutations':mut.count,
			'Distinct protein changes':e.values.length,
			};
		var v = e.values.sort(function(a,b){
			return b.values.length - a.values.length; });
		if(v.length>5){
			for(var i=0;i<4;++i){
				var el=v[i];
				var alt = '- ' + el.key;
				ttinfo[alt] = el.values.length==1? el.values.length + ' occurrence' : el.values.length + ' occurrences';
			}
			ttinfo['Others'] = (v.length-4) +'('+ d3.sum(v.slice(4),function(d){
				return d.values.length;}) +' total)';
		}
		else{
			for(var i=0;i<v.length;++i){
				var el=v[i];
				var alt = '- ' + el.key;
				ttinfo[alt] = el.values.length==1? el.values.length + ' occurrence' : el.values.length + ' occurrences';
			}
		}
		var tt=makeBasicTooltip(ttinfo);
		return tt;	
	}
	function mutationPiechart(mut){
		var tt = $('<div>').css({border:'thin black solid',backgroundColor:'white',padding:'0.2em',display:'inline-block','text-align':'center'});
		
		var nest = mut.nestedAlterations;	
		
		var dt = d3.select(tt[0]);
		dt.append('h4').text(mut.wildtype+': '+mut.count+' mutations reported');
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
	function mutationBarchart(mut){
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
	function mutationBarchart2(mut, el){
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

