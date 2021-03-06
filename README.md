# jsProteinMapper
jsProteinMapper is a browser-based tool for interactive visualization of genomic alterations in relation to the protein structure of the gene product.

This guide contains information for:
- [users](#for-users): how to use the widget to interact with your data
- [developers](#for-developers): how to add the widget to your page, configure it with your desired data sources, and interact with it using javascript.

# Demo
<a href="https://pearcetm.github.io/jsproteinmapper" target="_blank">Check it out</a>  

# For users
The jsProteinMapper widget lets you see where a variant of interest falls in relation to the structure of the protein - for example, if it is in a functional domain, or at the site of a particular active group. In addition, it can display graphs ("tracks") of previously-reported data for context. In order to interactively explore the data, use your mouse or touchscreen to zoom in and out, navigate around the protein, and show/hide information.

## Zooming in and out
By default, the structure of the whole protein is displayed in the widget. However, this "wide view" can make it hard to see certain details around locations of interest. Similarly, each variant track is initially scaled to show the full range of the data. The widget provides a number of ways to zoom in and out to explore the data most effectively.

- Using the scroll wheel (mouse - anywhere on the widget) or pinch gesture (touchscreen - on the protein structure), you can control the zoom on the X-axis to get a closer look. Click (or touch) and drag lets you move the whole structure left or right.
- Double-clicking on the protein structure will also zoom in (X-axis)
- A double-click on a *variant track* will zoom in on the *Y-axis of that track*, to show lower-frequency events more clearly. If you zoom in too far, the zoom level resets.
- If you are using a PC, the variant tracks can also be zoomed in and out using the mouse wheel while holding the shift key. On a touch-enabled device, you can zoom on variant tracks using pinch gestures on the track of interest.
- To zoom directly to an area of interest, hold shift while clicking and dragging. This will draw a rectangle, and the widget will zoom to that region when you release the mouse button. If this is done on a variant track, you can zoom in X and Y simultaneously.

In addition, each variant track contains a control panel with buttons for zooming in and out of both axes, and resetting the axes to the initial zoom level. The y-axis scale can be drawn with either a linear (default) or logarithmic scale. The control panels can be turned on and off using the [options window](#optionswindow).  

## Showing more information
To see more information - for example, details of a protein domain or a variant - simply hover your mouse (or tap a touchscreen) to reveal a popup tooltip. If you prefer clicking, rather than hovering, to show the tooltip, use the [options window](#optionswindow) to choose this mode of action.

## Using the options window to configure behavior
In the upper right corner of widget is an "Options" button, which brings up a window with options for configuring the behavior of certain actions: 
- Show/hide the clickable control panels
- Switch between click and hover mode for showing additional information in the tooltip

# For developers
## Adding the widget to a webpage
### Include the following resources:
- jsproteinmapper.css
- jQuery
- d3.js (version 4)
- d3tip.js
- jsproteinmapper.js
- your own javascript, which calls `new jsProteinMapper();` (see below)

### Create the widget and initialize it
When jsproteinmapper.js is executed, a constructor function named `jsProteinMapper` is added to the global workspace. Call this function to create an instance of the widget.
```javascript
var widget = new jsProteinMapper();
```
Then, [configure](#configuration-options) and [initialize](#init) it.
```javascript
widget.init(config);
```

## Application programming interface
The widget provides functions so that user scripts can interact in certains ways.
- [init()](#init)
- [setPfamData()](#setpfamdata)
- [setVariantOfInterest()](#setvariant)
- [setTracks()](#settracks)
- [drawWidget()](#drawwdget)
- [Helper functions](#helper-functions)
- [helpers.pfamAjaxResults](#helperspfamajaxresults)
- [helpers.parseVariantString](#helpersparsevariantstring)
- [helpers.aggregate](#helpersaggregate)
  - Functions to generate tooltips:
    - [helpers.tooltips.basicTooltip](#helperstooltipsbasictooltip)
    - [helpers.tooltips.variantTable](#helperstooltipsvarianttable)
    - [helpers.tooltips.variantPiechart](#helperstooltipsvariantpiechart)
    - [helpers.tooltips.variantBarchart](#helperstooltipsvariantbarchart)
  

### init()
Initializes the widget, creating html and svg elements for data visualization and graphical user interface.

Creating a widget with all default values is as simple as calling `init()` with no arguments:
```javascript
widget.init();
```
`init` removes existing widgets, creates a new widget in a container element (`<div class='jsproteinmapper'></div>`), and appends it to a target element. By default, the target is `<body>`. This behavior can be customized by providing a selector for a target element. This, and other configuration options, are discussed in detail below.

#### Configuration options
The widget can be configured by passing in an object with desired options defined as fields. The object is then merged with default values (see below), so only non-default values need to be specified.

A full set of the default configuration options is below:
```javascript
default_options = {
    //target: selector for element to append the widget to.
		target:'body',
    
    //pfamData: data in string format defining the protein structure
		pfamData:null, //parsed response from pfam, via a proxy server
    
    //variantOfInterest: javascript object containing information about the variant of interest
		variantOfInterest:{},//fields: codon, annotation
    
    //variantTracks: array of objects, one per track
		variantTracks:[],//array of objects, each of which has fields: 'label' and 'data'
    
    //width, height: dimensions of the widget (pixels)
		width:775,
		height:300,
    
    //fontSize: font size of the text
		fontSize:16,
    
    //variantColor: string representation of the color to highlight the variant of interest
		variantColor:'red',
    
    //geometry of the protein functional domain annotations
		lollipopHeight:15,
		lollipopHeadSize:6,
		disulphideBridgeHeightIncrement:0,
    
    //geometry of the protein structure graphic
		regionHeight:16,
		sequenceHeight:7,
    
    //tracksYOffset: spacing, in pixels, between the protein structure and where the graphs of variant tracks start
		tracksYOffset:20,
    
    //padding: padding surrounding the widget, in pixels
		padding:25,
    
    //trackFillColor: background color for variant tracks
		trackFillColor:'none',
		
    //showControls: [true|false] initial option for showing/hiding control panels.		
		showControls:true,
    //tooltip: ['hover'|'click'] inital option for tooltip behavior		
		tooltip:'hover',
	};
```

#### Example: initalize the widget with a variant of interest, some non-default geometry options, and an existing html target
```javascript
var options = {
        sequenceHeight: 10,
        padding: 50,
        variantOfInterest: {
            codon: 600,
            annotation: {'Protein alteration':'p.V600E'}
        },
        target: '#widget-container'
};
widget.init(options);
```

### setPfamData()
Protein structure data from [pfam](pfam.xfam.org) can be passed into the widget as a [configuration option](#configuration-options), but can also be added after the widget has been created, using the setPfamData() function. See the [section on fetching pfam data](#fetching-protein-structure-from-pfam) for more information about this process, as well as the [helper function](#helper-functions) that provide a default parsing pipeline for pfam data.

In this example, data is fetched from pfam via an ajax call, and the results are passed to the widget within the success callback.
```javascript
var uniprot_id = 'P15056'; //corresponds to BRAF
//build the url that pfam expects
var pfam_url = 'https://pfam.xfam.org/protein/'+uniprot_id+'/graphic';
$.ajax({
	url:pfam_url,
	type:'GET',
	success:widget.helpers.pfamAjaxResults(function(r){ //use the helper function to add tooltips
		widget.setPfamData(r); //in the callback, set the pfam data 
		widget.drawWidget(); //then draw the widget
		}),
	failure:function(data,textStatus,jqXHR){
		console.log('Failed to fetch data from PFAM',JSON.stringify(data));
	},
});

```

### setVariant()
Information about a variant of interest can be passed into the widget during initialization as a [configuration option](#configuration-options), but can also be added after the widget has been created, using the setVariant() function. 

```javascript
widget.setVariant({
    codon:245, //position of the alteration in protein coordinates
    annotation:{
        'Protein alteration':'p.G245S' //text label to be displayed as a tooltip on mouseover/touch
    }
});
widget.drawWidget(); //trigger a redraw
```

### setTracks()
Variant tracks are bar graphs of other data that serve to provide context about the localization of variants relative to the protein structure. These data can be provided during initialization as a [configuration option](#configuration-options), but can also be added after the widget has been created, using the setTracks() function.

Whether setting up variant tracks during configuration or using the `setTracks()` function, the data should be organized as an **array of objects** - the array defines the order of the tracks, and each object contains fields for the *label* and the *data* for that track. See the section on [variant track data objects](#variant-tracks) for details of how the track data should be structured.

In the example below, two tracks of variant data are added, to allow comparisons to external and internal databases. 
```javascript
widget.setTracks([
    { 
        label:'COSMIC database',
        data:cosmicDataString
    }, 
    {
        label:'In-house database',
        data:inhouseDataString
    }
]);
				
widget.drawWidget(); //trigger a redraw
```

### drawWidget()
When you are done configuring the widget, either during initialization or using the API functions to add data, call the `drawWidget()` function to complete the process and generate the interactive graphic.
```javascript
//all done with configuration... yay!
//now draw the widget
widget.drawWidget();
```
## Helper functions
The jsProteinMapper widget provides a number of helper functions that provide default implementations of certain tasks. These functions are exposed in an object named "helpers." Using these helper functions is **not required** - they are merely a convenient option for getting started.

### helpers.pfamAjaxResults
Querying data from pfam is often done asynchronously using AJAX, so `helpers.pfamAjaxResults()` *returns a function* suitable for use as the `success` callback of the ajax call. It also *takes a function as an argument* - this function is passed the parsed data structure and is responsible for continuing to doing useful things like drawing the widget.

**Argument:** callback function with prototype `function(protein_structure){...}`, to be called after parsing the data.  
**Return value:** function with prototype `function(data, status, jqXHR){...}`, suitable for use as an ajax success callback.

To make it more clear what is happening, the implementation of the helper function is below.
```javascript
function pfamAjaxResults(callback){
    //create a function suitable for use as an ajax success callback
    function f(data,textStatus,jqXHR){		
        var response = data;
	if(typeof(data)=="string") response=JSON.parse(response); //parse the json string if needed
	var r = response[0]; //extract the first result
	// iterate over the functional regions
	$.each(r.regions,function(i,e){
	    //use the helper function makeBasicTooltip to add additional information about the region to a simple tooltip
            var tt=makeBasicTooltip({
                title:'Region: '+e.metadata.identifier+' ('+e.metadata.accession+')',
                Description:e.metadata.description,
                Coordinates:e.metadata.start+' - '+e.metadata.end+' (alignment region '+e.metadata.aliStart+' -'+e.metadata.aliEnd+')',
                Source:e.metadata.database
            });
	    //add this object to the region as the "tooltip" field.
	    e.tooltip = tt;
        });
	//pass the data on to the callback to continue processing
        callback(r);
    }
    
    //return the above function
    return f;
};
```

See the helper function [helpers.tooltips.basicTooltip] for an explanation of the function `makeBasicTooltip` in the example code above.

### helpers.parseVariantString
This function creates structured data from a text string representation, which may come from a text file or database. It splits a text string with variant data into an array of objects. The text string should be a repeating sequence of tuples in the order [gene_name, cdna_change, protein_change]. The string is parsed into objects which have fields {codon(numeric), pdot(string) cdna(string)}. The string is split on whitespace - newlines, tabs, and spaces all count - so do not put any whitespace inside a value.

It returns an array of objects, each of which contains properties `codon`, `pdot`, and `cdna`.

```javascript
function parseVariantString(geneName, variants){
    m = variants.split(/\s+/);
        mut = [];
	for(ii=1;ii<m.length;ii+=3){
	    var gene=m[ii];
            var cdna=m[ii+1];
	    var prot=m[ii+2];
	    var codon = prot.match(/p.[a-zA-Z](\d+)/); //extract the location of the protein change
	    
	    //if the gene_name field matches the gene of interest, add it to the array
	    if(gene.toLowerCase() == geneName.toLowerCase()){
	        mut.push({
		    codon: codon[1],
		    pdot:prot,
		    cdna:cdna
		);
	    }
			
	}  
		
    return mut;
}
```

### helpers.aggregate
This helper function takes a set of variants and uses d3's nest functionality to aggregate the data set by codon, counting the number of variants at each site, and within that, counting the number of each distinct variant. This is useful for creating meaningful tooltips that display the proportions of different alterations at each site within a protein structure.

The aggregate helper function expects an array of objects with `codon`, `pdot`, and `cdna` fields. See [helpers.parseVariantString](#helpersparsevariantstring) for an example.

It returns an array of objects. Each object has the following format:

```javascript
object = {
	codon: 1, //position in the protein structure
	count: 5, //number of alterations at this position
	nestedAlterations: [Array of Objects]
};
```

The most important fields are `codon` and `count`: these define the x and y location of the bars in the histogram representing the number of alterations at that location. The helper function also creates an array of objects and stores in the the `nestedAlterations` field. This array is used by the tooltip generator functions to create the bar charts, pie charts, or other display of the breakdown of variants reported at each position.

### helpers.tooltips.basicTooltip
Displays text-based details of alteration frequency.

### helpers.tooltips.variantTable
Displays [aggregated](#helpers.aggregate) variant data in table form.

### helpers.tooltips.variantPiechart
Displays [aggregated](#helpers.aggregate) variant data in pie chart form.

### helpers.tooltips.variantBarchart
Displays [aggregated](#helpers.aggregate) variant data in bar chart form.

## Fetching protein structure from pfam
When protein structure information is fetched from [pfam](pfam.xfam.org), the resulting JSON string must first be parsed to create a javascript object. The results are returned in an array; since we are only dealing with a *single* result, the relevant information is in the *first element* of the array.

```javascript
results = JSON.parse(json_string_from_pfam); //parse the json string
protein_structure = results[0]; //take first item from the array
```

By itself, these results are enough for the widget to draw the protein backbone and functional regions. Additional information about each region can be displayed in a tooltip by adding html to the "tooltip" field.

To retrieve the JSON data from pfam, create a URL that includes the Uniprot ID of the gene:
```javascript
var uniprot_id = 'P15056'; //corresponds to BRAF
//build the url that pfam expects
var pfam_url = 'https://pfam.xfam.org/protein/'+uniprot_id+'/graphic';

//make an AJAX GET request
$.ajax({
	url:pfam_url,
	type:'GET',
	success:successCallbackFcn
	},
});
```

## Variant tracks
To provide data for the widget to use for drawing variant tracks above the protein structure, pass in an array of objects. Each object must contain the title for the track in the "label" field, and an array of objects in the "data" field.

The data must be an array of objects; each object must contain the property `codon` (required). By default, a simple histogram (bar chart) will be created to plot the number of events at each codon. To use this default histogram, a property `count` is required, describing how many events occurred at each codon. Bars are black by default, but if a `color` property is defined, the specified color will be used instead. Additional properties can be optionally included and used to create tooltips with more detailed information about the variants reported at each location. See [helpers.aggregate](#helpersaggregate) for more information.

**To use the default histogram:**

```javascript
var data = [
	{
		codon: 1,
		count: 5
		//this bar will be black by default
	},
	{
		codon: 2,
		count: 3,
		color: 'black', //black is explicitly defined
	},
	{
		codon: 3,
		count: 15,
		color: 'red', //this bar will be red
	}
];
```

**Advanced usage:** The `drawTrackItem` property can be used to pass a callback function, which can be used to draw any desired visual representation of the data at the codon. The callback function signature should be `function(group,scale)`. Arguments:
1) `group`, the current `<g>` element, which is already transformed to the appropriate location for the codon, and which additional SVG elements should be added to. 
2) `scale`, a function which will convert a numeric 'count' value to the appropriate pixel position.

> ***Important:* In order to make the element render appropriately while zooming or changing the axis scale, you must also provide a `redraw` function to update any necessary attributes (typically `y` and/or `height`)**

*Example of custom draw callback:*
```javascript
var data = [
	{
		codon: 1,
		count: 5
		//solid black bar, by default
	},
	{
		codon: 2,
		count:8,
		bars: [
			{
				start:0,
				end:5,
				color:'blue'
			},
			{
				start:5,
				end:8,
				color:'red'
			},
		],
		drawTrackItem: function(g,scale){
			g.selectAll('rect')
				.data((d) => d.bars)
				.enter()
				.append('rect')
				.attr('class','redraw')
				.attr('y',(d) => scale(d.start) )
				.attr('height',(d) => scale(d.end) - scale(d.start) )
				.attr('width',1)
				.attr('fill',(d) => d.color)
				.datum((d) => { d.redraw=redraw; return d;} )
			function redraw(el,newY){
				el.attr('y',(d) => newY(d.start) )
					.attr('height',(d) => newY(d.end) - newY(d.start) )
			}
		}
	}
];
```

*Example*: Beginning from a whitespace separated list of tuples, use the [parseVariantString](#helpersparsevariantstring) and [aggregate](#helpersaggregate) helper functions to create an appropriate array.

```javascript
//create a whitespace-separated list with tuples [genename cdna pdot]
var variantString = '
	TP53	c.1176_1177insA	p.D393fs*>2  \
	TP53	c.1176A>G	p.S392S  \
	TP53	c.1175C>T	p.S392L  \
	';

var variantObjects = widget.helpers.parseVariantString(variantString);
var variantCounts = widget.helpers.aggregate(variantObjects);

var variantTracks = []; //initialize empty array
var track1 = {
	label: 'Database #1',
	data: variantCounts
};

//add the object to 
variantTracks.push(track1);
```
