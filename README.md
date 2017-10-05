# jsProteinMapper
jsProteinMapper is a browser-based tool for interactive visualization of genomic alterations in relation to the protein structure of the gene product.

This guide contains information for:
- [users](#for-users): how to use the widget to interact with your data
- [developers](#for-developers): how to add the widget to your page, configure it with your desired data sources, and interact with it using javascript.

# For users
The jsProteinMapper widget lets you see where a variant of interest falls in relation to the structure of the protein - for example, if it is in a functional domain, or at the site of a particular active group. In addition, it can display graphs ("tracks") of previously-reported data for context. In order to interactively explore the data, use your mouse or touchscreen to zoom in and out, navigate around the protein, and show/hide information.

## Zooming in and out
By default, the structure of the whole protein is displayed in the widget. However, this "wide view" can make it hard to see certain details around locations of interest. The widget provides a number of ways to zoom in to show the data most effectively.

- Using the scroll wheel (mouse - anywhere on the widget) or pinch gesture (touchscreen - on the protein structure), you can control the zoom on the X-axis to get a closer look. Click (or touch) and drag lets you move the whole structure left or right.
- Double-clicking on the protein structure will also zoom in (X-axis)
- A double-click on a *mutation track* will zoom in on the *Y-axis of that track*, to show lower-frequency events more clearly. If you zoom in too far, the zoom level resets.
- If you are using a PC, the mutation tracks can also be zoomed in and out using the mouse wheel while holding the shift key. On a touch-enabled device, you can zoom on mutation tracks using pinch gestures on the track of interest.
- To zoom directly to an area of interest, hold shift while clicking and dragging. This will draw a rectangle, and the widget will zoom to that region when you release the mouse button. If this is done on a mutation track, you can zoom in X and Y simultaneously.

## Showing more information
To see more information - for example, details of a protein domain or a mutation - simply hover your mouse (or tap a touchscreen) to reveal a popup tooltip. 

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
- [setPfamData()](#setPfamData)
- [setMutation()](#setMutation)
- [setTracks()](#setTracks)
- [drawWidget()](#drawWidget)
- [Helper functions](#helper-functions)
- [helpers.pfamAjaxResults](#helperspfamajaxresults)
- [helpers.parseMutationString](#helpersparsemutationstring)
- [helpers.aggregate](#helpersaggregate)
  - Functions to generate tooltips:
    - [helpers.tooltips.basicTooltip](#helperstooltipsbasictooltip)
    - [helpers.tooltips.mutationTable](#helperstooltipsmutationtable)
    - [helpers.tooltips.mutationPiechart](#helperstooltipsmutationpiechart)
    - [helpers.tooltips.mutationBarchart](#helperstooltipsmutationbarchart)
  

### init()
Initializes the widget, creating html and svg elements for data visualization and graphical user interface.

Creating a widget with all default values is as simple as calling `init()` with no arguments:
```javascript
widget.init();
```
`init` removes existing widgets, creates a new widget in a container element (`<div class='jsproteinmapper'></div>`), and appends it to a target element. By default, the target is `<body>`. This behavior can be customized by providing a selector for a target element. This, and other configuration options, are discussed in detail below.

#### Configuration options
The widget can be configured by passing in a structure with desired options defined as fields. The structure is then merged with default values (see below), so only non-default values need to be specified.

A full set of the default configuration options is below:
```javascript
default_options = {
    //target: selector for element to append the widget to.
		target:'body',
    
    //pfamData: data in string format defining the protein structure
		pfamData:null, //parsed response from pfam, via a proxy server
    
    //mutation: javascript structure containing information about the variant of interest
		mutation:{},//fields: codon, annotation
    
    //mutationTracks: array of structures, one per track
		mutationTracks:[],//array of structures, each of which has fields: 'label' and 'data'
    
    //width, height: dimensions of the widget (pixels)
		width:775,
		height:300,
    
    //fontSize: font size of the text
		fontSize:16,
    
    //mutationColor: string representation of the color to highlight the variant of interest
		mutationColor:'red',
    
    //geometry of the protein functional domain annotations
		lollipopHeight:15,
		lollipopHeadSize:6,
		disulphideBridgeHeightIncrement:0,
    
    //geometry of the protein structure graphic
		regionHeight:16,
		sequenceHeight:7,
    
    //tracksYOffset: spacing, in pixels, between the protein structure and where the graphs of mutation tracks start
		tracksYOffset:20,
    
    //padding: padding surrounding the widget, in pixels
		padding:25,
    
    //trackFillColor: background color for mutation tracks
		trackFillColor:'none'
	};
```

#### Example: initalize the widget with a mutation (variant of interest), some non-default geometry options, and an existing html target
```javascript
var options = {
        sequenceHeight: 10,
        padding: 50,
        mutation: {
            codon: 600,
            annotation: {'Protein alteration':'p.V600E'}
        },
        target: '#widget-container'
};
widget.init(options);
```

### setPfamData()
Protein structure data from [pfam](pfam.xfam.org) can be passed into the widget as a [configuration option](#configuration-options), but can also be added after the widget has been created, using the setPfamData() function. See the [section on fetching pfam data](#fetching-protein-structure-from-pfam) for more information about this process, as well as the [helper function](#helper-functions) that provide a default parsing pipeline for pfam data.

In this example, data is fetched from pfam via an ajax call to a proxy server, and the results are passed to the widget within the success callback.
```javascript
var genename = 'braf';
var proxy_url = 'www.your-proxy-server-here.com/' + genename;
$.ajax({
    url: proxy_url,
    success: function(data, status, jqXHR){
        var parsedData = JSON.parse(data); //parse JSON data
        var pfamData = parsedData[0]; //unwrap the top-level array to get the structure we want
        widget.setPfamData(pfamData); //pass it to the widget
        widget.drawWidget(); //trigger a redraw
    }
});

```

### setMutation()
Information about a mutation/variant of interest can be passed into the widget during initialization as a [configuration option](#configuration-options), but can also be added after the widget has been created, using the setMutation() function. 

```javascript
widget.setMutation({
    codon:245, //position of the alteration in protein coordinates
    annotation:{
        'Protein alteration':'p.G245S' //text label to be displayed as a tooltip on mouseover/touch
    }
});
widget.drawWidget(); //trigger a redraw
```

### setTracks()
Mutation tracks are bar graphs of other data that serve to provide context about the localization of mutations relative to protein structure. These data can be provided during initialization as a [configuration option](#configuration-options), but can also be added after the widget has been created, using the setTracks() function.

Whether setting up mutation tracks during configuration or using the `setTracks()` function, the data should be organized as an **array of structures** - the array defines the order of the tracks, and each structure contains fields for the *label* and the *data* for that track. See the section on [mutation track data structures](#mutation-tracks) for details of how the track data should be structured.

In the example below, two tracks of mutation data are added, to allow comparisons to external and internal databases. 
```javascript
widget.setTracks([
    { 
        label:'COSMIC database',
        data:cosmicDataStructure
    }, 
    {
        label:'In-house database',
        data:inhouseDataStructure
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
The jsProteinMapper widget provides a number of helper functions that provide default implementations of certain tasks. These functions are exposed in a structure named "helpers." Using these helper functions is **not required** - they are merely a convenient option for getting started.

### helpers.pfamAjaxResults
Querying data from pfam is often done asynchronously using AJAX, so `helpers.pfamAjaxResults()` *returns a function* suitable for use as the `success` callback of the ajax call. It also *takes a function as an argument* - this function is passed the parsed data structure and is responsible for continuing to doing useful things like drawing the widget.

**Argument:** callback function with prototype `function(protein_structure){...}`, to be called after parsing the data.  
**Return value:** function with prototype `function(data, status, jqXHR){...}`, suitable for use as an ajax success callback.

To make it more clear what is happening, the implementation of the helper function is below.
```javascript
function pfamAjaxResults(callback){
    //create a function suitable for use as an ajax success callback
    function f(data,textStatus,jqXHR){		
        var response=JSON.parse(data); //parse the json string
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

### helpers.parseMutationString
This function creates structured data from a text string representation, which may come from a text file or database. It splits a text string with mutation data into an array of structures. The text string should be a repeating sequence of tuples in the order [gene_name, cdna_change, protein_change]. The string is parsed into structures which have fields {codon(numeric), pdot(string) cdna(string)}. The string is split on whitespace - newlines, tabs, and spaces all count - so do not put any whitespace inside a value.

```javascript
function parseMutationString(geneName, mutations){
    m = mutations.split(/\s+/);
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
This helper function takes a set of mutations and uses d3's nest functionality to aggregate the data set by codon, counting the number of alterations at each site, and within that, counting the number of each distinct alteration. This is useful for creating meaningful tooltips that display the proportions of different alterations at each site within a protein structure.

The aggregate helper function expects an array of structures with `codon`, `pdot`, and `cdna` fields. See [helpers.parseMutationString](#helpersparsemutationstring) for an example.

### helpers.tooltips.basicTooltip
Displays text-based details of alteration frequency.

### helpers.tooltips.mutationTable
Displays [aggregated](#helpers.aggregate) mutation data in table form.

### helpers.tooltips.mutationPiechart
Displays [aggregated](#helpers.aggregate) mutation data in pie chart form.

### helpers.tooltips.mutationBarchart
Displays [aggregated](#helpers.aggregate) mutation data in bar chart form.

## Fetching protein structure from pfam
When protein structure information is fetched from [pfam](pfam.xfam.org), the resulting JSON string must first be parsed to create a javascript structure. The results are returned in an array; since we are only dealing with a *single* result, the relevant information is in the *first element* of the array.

```javascript
results = JSON.parse(json_string_from_pfam); //parse the json string
protein_structure = results[0]; //take first item from the array
```

By itself, these results are enough for the widget to draw the protein backbone and functional regions. Additional information about each region can be displayed in a tooltip by adding html to the "tooltip" field.

Currently, pfam does not provide an API accessible for ajax calls. To work around this, you can set up a proxy server to generate the http request, and return the resulting textual information. For example, in php:

```php
$url = 'http://pfam.xfam.org/protein/' . $protein_id . '/graphic';
$response_text = file_get_contents(url);
```

If you wish to use the app using ajax in this manner, make sure the proxy server is set up with the appropriate headers for Cross Origin Resource Sharing (CORS), if needed.
