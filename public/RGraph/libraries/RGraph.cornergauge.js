// version: 2014-06-26
    /**
    * o--------------------------------------------------------------------------------o
    * | This file is part of the RGraph package. RGraph is Free Software, licensed     |
    * | under the MIT license - so it's free to use for all purposes. If you want to   |
    * | donate to help keep the project going then you can do so here:                 |
    * |                                                                                |
    * |                             http://www.rgraph.net/donate                       |
    * o--------------------------------------------------------------------------------o
    */

    RGraph = window.RGraph || {isRGraph: true};

    /**
    * The constructor
    * 
    * @param object id    The canvas tag ID
    * @param array  min   The minimum value
    * @param array  max   The maximum value
    * @param array  value The indicated value
    */
    RGraph.CornerGauge = function (id, min, max, value)
    {
        var tmp = RGraph.getCanvasTag(id);

        // Get the canvas and context objects
        this.id                = tmp[0];
        this.canvas            = tmp[1];
        this.context           = this.canvas.getContext ? this.canvas.getContext("2d", {alpha: (typeof id === 'object' && id.alpha === false) ? false : true}) : null;
        this.canvas.__object__ = this;
        this.type              = 'cornergauge';
        this.min               = min;
        this.max               = max;
        this.value             = RGraph.stringsToNumbers(value);
        this.angles            = {};
        this.angles.needle     = [];
        this.centerpin         = {};
        this.isRGraph          = true;
        this.currentValue      = null;
        this.uid               = RGraph.CreateUID();
        this.canvas.uid        = this.canvas.uid ? this.canvas.uid : RGraph.CreateUID();
        this.coordsText        = [];
        this.original_colors   = [];
        this.firstDraw         = true; // After the first draw this will be false

        /**
        * Range checking
        */
        if (typeof(this.value) == 'object') {
            for (var i=0; i<this.value.length; ++i) {
                if (this.value[i] > this.max) this.value[i] = max;
                if (this.value[i] < this.min) this.value[i] = min;
            }
        } else {
            if (this.value > this.max) this.value = max;
            if (this.value < this.min) this.value = min;
        }



        /**
        * Compatibility with older browsers
        */
        //RGraph.OldBrowserCompat(this.context);


        // Various config type stuff
        this.properties =
        {
            'chart.centerx':        null,
            'chart.centery':        null,
            'chart.radius':         null,
            'chart.gutter.left':    25,
            'chart.gutter.right':   25,
            'chart.gutter.top':     25,
            'chart.gutter.bottom':  25,
            'chart.strokestyle':    'black',
            'chart.linewidth':      2,
            'chart.title':          '',
            'chart.title.vpos':     0.5,
            'chart.title.size':     null,
            'chart.title.x':        null,
            'chart.title.y':        null,
            'chart.title.bold':     true,
            'chart.text.font':      'Arial',
            'chart.text.color':     '#666',
            'chart.text.size':      10,
            'chart.background.gradient.color1': '#ddd',
            'chart.background.gradient.color2': 'white',
            'chart.shadow':           true,
            'chart.shadow.color':     'gray',
            'chart.shadow.offsetx':   0,
            'chart.shadow.offsety':   0,
            'chart.shadow.blur':      15,
            'chart.scale.decimals': 0,
            'chart.scale.point':    '.',
            'chart.scale.thousand': ',',
            'chart.units.pre':      '',
            'chart.units.post':     '',
            'chart.resizable':       false,
            'chart.chart.resize.handle.background':       null,
            'chart.adjustable':       false,
            'chart.annotatable':      false,
            'chart.annotate.color':       'black',
            'chart.colors.ranges':    null,
            'chart.red.start':        min + (0.9 * (this.max - min)),
            'chart.green.end':        min + (0.7 * (this.max - min)),
            'chart.red.color':        'red',
            'chart.yellow.color':     'yellow',
            'chart.green.color':      '#0f0',
            'chart.value.text':       true,
            'chart.value.text.units.pre':  '',
            'chart.value.text.units.post': '',
            'chart.value.text.boxed': true,
            'chart.value.text.font': 'Arial',
            'chart.value.text.size': 18,
            'chart.value.text.bold': false,
            'chart.value.text.decimals': 0,
            'chart.centerpin.stroke':  'rgba(0,0,0,0)',
            'chart.centerpin.fill':    null, // Set in the DrawCenterpin function
            'chart.centerpin.color':    'blue',
            'chart.needle.colors':   ['#ccc', '#D5604D', 'red', 'green', 'yellow'],
            'chart.zoom.factor':            1.5,
            'chart.zoom.fade.in':           true,
            'chart.zoom.fade.out':          true,
            'chart.zoom.hdir':              'right',
            'chart.zoom.vdir':              'down',
            'chart.zoom.frames':            25,
            'chart.zoom.delay':             16.666,
            'chart.zoom.shadow':            true,
            'chart.zoom.background':        true
        }



        /*
        * Translate half a pixel for antialiasing purposes - but only if it hasn't beeen
        * done already
        */
        if (!this.canvas.__rgraph_aa_translated__) {
            this.context.translate(0.5,0.5);
            
            this.canvas.__rgraph_aa_translated__ = true;
        }



        // Short variable names
        var RG    = RGraph;
        var ca    = this.canvas;
        var co    = ca.getContext('2d');
        var prop  = this.properties;
        var jq    = jQuery;
        var pa    = RG.Path;
        var win   = window;
        var doc   = document;
        var ma    = Math;








        /**
        * An all encompassing accessor
        * 
        * @param string name The name of the property
        * @param mixed value The value of the property
        */
        this.set =
        this.Set = function (name, value)
        {
            name = name.toLowerCase();
    
            /**
            * This should be done first - prepend the property name with "chart." if necessary
            */
            if (name.substr(0,6) != 'chart.') {
                name = 'chart.' + name;
            }
    
            prop[name] = value;
    
            return this;
        };




        /**
        * An all encompassing accessor
        * 
        * @param string name The name of the property
        */
        this.get =
        this.Get = function (name)
        {
            /**
            * This should be done first - prepend the property name with "chart." if necessary
            */
            if (name.substr(0,6) != 'chart.') {
                name = 'chart.' + name;
            }
    
            return prop[name];
        };




        /**
        * The function you call to draw the line chart
        */
        this.draw =
        this.Draw = function ()
        {
            /**
            * Fire the onbeforedraw event
            */
            RG.FireCustomEvent(this, 'onbeforedraw');
    
    
            /**
            * Store the value (for animation primarily
            */
            this.currentValue = this.value;
    
            if (typeof this.gutterLeft == 'undefined') {
                this.gutterLeft   = prop['chart.gutter.left'];
                this.gutterRight  = prop['chart.gutter.right'];
                this.gutterTop    = prop['chart.gutter.top'];
                this.gutterBottom = prop['chart.gutter.bottom'];
            }
    
    
    
            /**
            * Work out the radius first
            */
            this.radius  = Math.min(
                                    (ca.width - this.gutterLeft - this.gutterRight),
                                    (ca.height - this.gutterTop - this.gutterBottom)
                                   );
    
            if (typeof(prop['chart.radius']) == 'number')  this.radius  = prop['chart.radius'];
    
    
    
            /**
            * Now use the radius in working out the centerX/Y
            */
            this.centerx = (ca.width / 2) - (this.radius / 2) + Math.max(30, this.radius * 0.1);
            this.centery = (ca.height / 2) + (this.radius / 2) - (this.radius * 0.1);



            /**
            * Stop this growing uncontrollably
            */
            this.coordsText = [];




    
            if (typeof prop['chart.centerx'] === 'number') this.centerx = prop['chart.centerx'];
            if (typeof prop['chart.centery'] === 'number') this.centery = prop['chart.centery'];
    
    
    
            /**
            * Parse the colors for gradients. Its down here so that the center X/Y can be used
            */
            if (!this.colorsParsed) {
    
                this.parseColors();
    
                // Don't want to do this again
                this.colorsParsed = true;
            }
    
    
    
            /**
            * Start with the background
            */
            this.DrawBackGround();
    
    
    
            /**
            * Draw the tickmarks
            */
            this.DrawTickmarks();
            
            
            /**
            * Draw the color bands
            */
            this.DrawColorBands();
            
            
            /**
            * Draw the label/value in text
            */
            this.DrawLabel();
    
    
            /**
            * Start with the labels/scale
            */
            this.DrawLabels();
    
    
            /**
            * Draw the needle(s)
            */
            if (typeof this.value === 'object') {
    
                for (var i=0,len=this.value.length; i<len; ++i) {

                    this.DrawNeedle(
                                    i,
                                    this.value[i],
                                    this.radius - 65
                                   );
                }
            } else {
                this.DrawNeedle(0, this.value, this.radius - 65);
            }



            /**
            * Draw the centerpin of the needle
            */
            this.DrawCenterpin();
    
    
            /**
            * Draw the title
            */
            var size = prop['chart.title.size'] ? prop['chart.title.size'] : prop['chart.text.size'] + 2
            prop['chart.title.y'] = this.centery + 20 - this.radius - ((1.5 * size) / 2);
            RGraph.DrawTitle(this,
                             prop['chart.title'],
                             this.guttertop,
                             this.centerx + (this.radius / 2),
                             size);
    
    
            /**
            * Setup the context menu if required
            */
            if (prop['chart.contextmenu']) {
                RGraph.ShowContext(this);
            }
    
    
    
            /**
            * This function enables resizing
            */
            if (prop['chart.resizable']) {
                RGraph.AllowResizing(this);
            }
    
    
            /**
            * This installs the event listeners
            */
            RGraph.InstallEventListeners(this);
    

            /**
            * Fire the onfirstdraw event
            */
            if (this.firstDraw) {
                RG.fireCustomEvent(this, 'onfirstdraw');
                this.firstDrawFunc();
                this.firstDraw = false;
            }




            /**
            * Fire the RGraph ondraw event
            */
            RGraph.FireCustomEvent(this, 'ondraw');
            
            return this;
        };




        /**
        * Draw the background
        */
        this.drawBackGround =
        this.DrawBackGround = function ()
        {
            if (prop['chart.shadow']) {
                RGraph.SetShadow(this, prop['chart.shadow.color'], prop['chart.shadow.offsetx'], prop['chart.shadow.offsety'], prop['chart.shadow.blur']);
            }
    
            co.strokeStyle = prop['chart.strokestyle'];
            co.lineWidth   = prop['chart.linewidth'] ? prop['chart.linewidth'] : 0.0001;
    
            /**
            * Draw the corner circle first
            */
            co.beginPath();
                co.arc(this.centerx,this.centery,30,0,RGraph.TWOPI,false);
            co.stroke();
    
            /**
            * Draw the quarter circle background
            */
            co.beginPath();
                co.moveTo(this.centerx - 20, this.centery + 20);
                co.arc(this.centerx - 20,this.centery + 20,this.radius,RGraph.PI + RGraph.HALFPI, RGraph.TWOPI,false);
            co.closePath();
            co.fill();
            co.stroke();
    
    
            // ==================================================================================================================== //
            
            
            RG.NoShadow(this);
    
    
            co.strokeStyle = prop['chart.strokestyle'];
            co.lineWidth   = prop['chart.linewidth'] ? prop['chart.linewidth'] : 0.0001;
    
            /**
            * Draw the quarter circle background
            */
            co.beginPath();
                co.moveTo(this.centerx - 20, this.centery + 20);
                co.arc(this.centerx - 20,this.centery + 20,this.radius,RGraph.PI + RGraph.HALFPI, RGraph.TWOPI,false);
            co.closePath();
            co.stroke();
    
    
            // ==================================================================================================================== //
    
    
            /**
            * Draw the background background again but with no shadow on
            */
            RGraph.NoShadow(this);
    
            co.lineWidth = 0;
            co.fillStyle = RGraph.RadialGradient(this, this.centerx,this.centery, 0,
                                                 this.centerx, this.centery, this.radius * 0.5,
                                                 prop['chart.background.gradient.color1'],
                                                 prop['chart.background.gradient.color2']);
    
            // Go over the bulge again in the gradient
            co.beginPath();
                co.moveTo(this.centerx, this.centery);
                co.arc(this.centerx,this.centery,30,0,RGraph.TWOPI,0);
            co.closePath();
            co.fill();
    
            // Go over the main part of the gauge with just the fill
            co.beginPath();
                co.moveTo(this.centerx - 20, this.centery + 20);
                co.lineTo(this.centerx - 20, this.centery + 20 - this.radius);
                co.arc(this.centerx - 20,this.centery + 20,this.radius,RGraph.PI + RGraph.HALFPI,RGraph.TWOPI,false);
            co.closePath();
            co.fill();
            
            // Draw the gray background lines.
            co.beginPath();
                co.lineWidth = 1;
                co.strokeStyle = '#eee';
                for (var i=0; i<=5; ++i) {
                    var p1 = RG.getRadiusEndPoint(this.centerx, this.centery, (RGraph.HALFPI / 5 * i) + RGraph.PI + RGraph.HALFPI, 30);
                    var p2 = RG.getRadiusEndPoint(this.centerx, this.centery, (RGraph.HALFPI / 5 * i) + RGraph.PI + RGraph.HALFPI, this.radius - 90);
    
                    co.moveTo(p1[0], p1[1]);
                    co.lineTo(p2[0], p2[1]);
                }
                
            co.stroke();
        };
    
    
    
        /**
        * Draw the needle
        */
        this.drawNeedle =
        this.DrawNeedle = function (index, value, radius)
        {
            var grad = RG.RadialGradient(this, this.centerx, this.centery, 0,
                                         this.centerx, this.centery, 20,
                                         'rgba(0,0,0,0)', prop['chart.needle.colors'][index])
    
            this.angles.needle[index] = (((value - this.min) / (this.max - this.min)) * RG.HALFPI) + RG.PI + RG.HALFPI;
            co.lineWidth    = 1
            co.strokeStyle  = 'rgba(0,0,0,0)';
            co.fillStyle    = grad;
    

            co.beginPath();
    
                co.moveTo(this.centerx, this.centery);
    
                co.arc(this.centerx,
                       this.centery,
                       10,
                       this.angles.needle[index] - RG.HALFPI,
                       this.angles.needle[index] - RG.HALFPI + 0.000001,
                       false);
    
                co.arc(this.centerx,
                       this.centery,
                       radius - 30,
                       this.angles.needle[index],
                       this.angles.needle[index] + 0.000001,
                       false);
    
                co.arc(this.centerx,
                       this.centery,
                       10,
                       this.angles.needle[index] + RG.HALFPI,
                       this.angles.needle[index] + RG.HALFPI + 0.000001,
                       false);
    
            co.stroke();
            co.fill();
        };




        /**
        * Draw the centerpin for the needle
        */
        this.drawCenterpin =
        this.DrawCenterpin = function ()
        {
            if (!prop['chart.centerpin.fill']) {
                prop['chart.centerpin.fill'] = RG.RadialGradient(this, this.centerx + 5,
                                                                       this.centery - 5,
                                                                       0,
                                                                       this.centerx + 5,
                                                                       this.centery - 5,
                                                                       20,
                                                                       'white',
                                                                       prop['chart.centerpin.color'])
            }
    
            co.strokeStyle = prop['chart.centerpin.stroke'];
            co.fillStyle   = prop['chart.centerpin.fill'];
    
            co.beginPath();
                co.lineWidth = 2;
                co.arc(this.centerx,this.centery, 15,0,RGraph.TWOPI,false);
            co.stroke();
            co.fill();
        };




        /**
        * Drawthe labels
        */
        this.drawLabels =
        this.DrawLabels = function ()
        {
            var numLabels = 6;
            
            co.fillStyle = prop['chart.text.color'];
    
            for (var i=0; i<numLabels; ++i) {
                co.beginPath();
    
                    var num  = Number(this.min + ((this.max - this.min) * (i / (numLabels - 1)))).toFixed(prop['chart.scale.decimals']);
                        num = RG.number_format(this, num, prop['chart.units.pre'], prop['chart.units.post']);
                    var angle = (i * 18) / (180 / RG.PI);
    
                    RG.Text2(this,{'font':prop['chart.text.font'],
                                   'size':prop['chart.text.size'],
                                   'x':this.centerx + ma.sin(angle) * (this.radius - 53),
                                   'y':this.centery - ma.cos(angle) * (this.radius - 53),
                                   'text':String(num),
                                   'valign':'top',
                                   'halign':'center',
                                   'angle': 90 * (i / (numLabels - 1)),
                                   'tag': 'scale'
                                  });
                co.fill();
            }
        };




        /**
        * Drawthe tickmarks
        */
        this.drawTickmarks =
        this.DrawTickmarks = function ()
        {
            var bigTicks   = 5;
            var smallTicks = 25;
    
            /**
            * Draw the smaller tickmarks
            */
            for (var i=0; i<smallTicks; ++i) {
                co.beginPath();
                var angle = (RG.HALFPI / (smallTicks - 1)) * i
                co.lineWidth = 1;
    
                co.arc(this.centerx,
                       this.centery,
                       this.radius - 44,
                       RG.PI + RG.HALFPI + angle,
                       RG.PI + RG.HALFPI + angle + 0.0001,
                       false);
                co.arc(this.centerx,
                       this.centery,
                       this.radius - 46,
                       RG.PI + RG.HALFPI + angle,
                       RG.PI + RG.HALFPI + angle + 0.0001,
                       false);
                co.stroke();
            }

            /**
            * Now draw the larger tickmarks
            */
            for (var i=0; i<bigTicks; ++i) {
                co.beginPath();
                var angle = (RG.HALFPI / (bigTicks - 1)) * i
                co.lineWidth = 1;
                co.arc(this.centerx,
                       this.centery,
                       this.radius - 43,
                       RG.PI + RG.HALFPI + angle,
                       RG.PI + RG.HALFPI + angle + 0.0001,
                       false);
                co.arc(this.centerx,
                       this.centery,
                       this.radius - 47,
                       RG.PI + RG.HALFPI + angle,
                       RG.PI + RG.HALFPI + angle + 0.0001,
                       false);
                co.stroke();
            }
        };




        /**
        * This draws the green background to the tickmarks
        */
        this.DrawColorBands = function ()
        {
            if (RG.is_array(prop['chart.colors.ranges'])) {
    
                var ranges = prop['chart.colors.ranges'];
    
                for (var i=0,len=ranges.length; i<len; ++i) {
    
                    co.fillStyle = ranges[i][2];
                    co.lineWidth = 0;
    
                    co.beginPath();
                        co.arc(this.centerx,
                               this.centery,
                               this.radius - 54 - (prop['chart.text.size'] * 1.5),
                               (((ranges[i][0] - this.min) / (this.max - this.min)) * RG.HALFPI) + (RG.PI + RG.HALFPI),
                               (((ranges[i][1] - this.min) / (this.max - this.min)) * RG.HALFPI) + (RG.PI + RG.HALFPI),
                               false);
    
                        co.arc(this.centerx,
                               this.centery,
                               this.radius - 54 - 10 - (prop['chart.text.size'] * 1.5),
                               (((ranges[i][1] - this.min) / (this.max - this.min)) * RG.HALFPI) + (RG.PI + RG.HALFPI),
                               (((ranges[i][0] - this.min) / (this.max - this.min)) * RG.HALFPI) + (RG.PI + RG.HALFPI),
                               true);
                    co.closePath();
                    co.fill();
                }
    
                return;
            }
    
    
    
    
            /**
            * Draw the GREEN region
            */
            co.strokeStyle = prop['chart.green.color'];
            co.fillStyle = prop['chart.green.color'];
            
            var greenStart = RG.PI + RG.HALFPI;
            var greenEnd   = greenStart + (RG.TWOPI - greenStart) * ((prop['chart.green.end'] - this.min) / (this.max - this.min))
    
            co.beginPath();
                co.arc(this.centerx, this.centery, this.radius - 54 - (prop['chart.text.size'] * 1.5), greenStart, greenEnd, false);
                co.arc(this.centerx, this.centery, this.radius - 54 - (prop['chart.text.size'] * 1.5) - 10, greenEnd, greenStart, true);
            co.fill();
    
    
            /**
            * Draw the YELLOW region
            */
            co.strokeStyle = prop['chart.yellow.color'];
            co.fillStyle = prop['chart.yellow.color'];
            
            var yellowStart = greenEnd;
            var yellowEnd   = (((prop['chart.red.start'] - this.min) / (this.max - this.min)) * RG.HALFPI) + RG.PI + RG.HALFPI;
    
            co.beginPath();
                co.arc(this.centerx, this.centery, this.radius - 54 - (prop['chart.text.size'] * 1.5), yellowStart, yellowEnd, false);
                co.arc(this.centerx, this.centery, this.radius - 54 - (prop['chart.text.size'] * 1.5) - 10, yellowEnd, yellowStart, true);
            co.fill();
    
    
            /**
            * Draw the RED region
            */
            co.strokeStyle = prop['chart.red.color'];
            co.fillStyle = prop['chart.red.color'];
            
            var redStart = yellowEnd;
            var redEnd   = RGraph.TWOPI;
    
            co.beginPath();
                co.arc(this.centerx, this.centery, this.radius - 54 - (prop['chart.text.size'] * 1.5), redStart, redEnd, false);
                co.arc(this.centerx, this.centery, this.radius - 54 - (prop['chart.text.size'] * 1.5) - 10, redEnd, redStart, true);
            co.fill();
        };




        /**
        * Draw the value in text
        */
        this.drawLabel =
        this.DrawLabel = function ()
        {
            if (prop['chart.value.text']) {
    
                co.strokeStyle = prop['chart.text.color'];
                co.fillStyle   = prop['chart.text.color'];
                
                var value = typeof(this.value) == 'number' ? this.value.toFixed(prop['chart.value.text.decimals']) : this.value;

                if (typeof(value) == 'object') {
                    for (var i=0; i<value.length; ++i) {
                        value[i] = parseFloat(value[i]).toFixed(prop['chart.value.text.decimals']);
                    }
                    
                    value = value.toString();
                }

                RG.Text2(this,{'font':prop['chart.value.text.font'],
                               'size':prop['chart.value.text.size'],
                               'x':this.centerx + (ma.cos((RG.PI / 180) * 45) * (this.radius / 3)),
                               'y':this.centery - (ma.sin((RG.PI / 180) * 45) * (this.radius / 3)),
                               'text': prop['chart.value.text.units.pre'] + value + prop['chart.value.text.units.post'],
                               'valign':'center',
                               'halign':'center',
                               'bounding':prop['chart.value.text.boxed'],
                               'boundingFill':'white',
                               'bold': prop['chart.value.text.bold'],
                               'tag': 'value.text'
                              });
            }
        };




        /**
        * A placeholder function
        * 
        * @param object The event object
        */
        this.getShape = function (e) {};




        /**
        * A getValue method
        * 
        * @param object e An event object
        */
        this.getValue = function (e)
        {
            var mouseXY = RGraph.getMouseXY(e);
            var mouseX  = mouseXY[0];
            var mouseY  = mouseXY[1];

            var angle = RG.getAngleByXY(this.centerx, this.centery, mouseX, mouseY);
    
            if (angle > RG.TWOPI && angle < (RG.PI + RG.HALFPI)) {
                return null;
            }
    
            var value = ((angle - (RG.PI + RG.HALFPI)) / (RG.TWOPI - (RG.PI + RG.HALFPI))) * (this.max - this.min);
                value = value + this.min;
    
            if (value < this.min) {
                value = this.min
            }
    
            if (value > this.max) {
                value = this.max
            }
            
            // Special case for this chart
            if (mouseX > this.centerx && mouseY > this.centery) {
                value = this.max;
            }
    
            return value;
        };




        /**
        * The getObjectByXY() worker method. Don't call this call:
        * 
        * RGraph.ObjectRegistry.getObjectByXY(e)
        * 
        * @param object e The event object
        */
        this.getObjectByXY = function (e)
        {
            var mouseXY = RGraph.getMouseXY(e);
    
            if (
                   mouseXY[0] > (this.centerx - 5)
                && mouseXY[0] < (this.centerx + this.radius)
                && mouseXY[1] > (this.centery - this.radius)
                && mouseXY[1] < (this.centery + 5)
                && RG.getHypLength(this.centerx, this.centery, mouseXY[0], mouseXY[1]) <= this.radius
                ) {
                return this;
            }
        };




        /**
        * This method handles the adjusting calculation for when the mouse is moved
        * 
        * @param object e The event object
        */
        this.adjusting_mousemove =
        this.Adjusting_mousemove = function (e)
        {
            /**
            * Handle adjusting for the Bar
            */
            if (prop['chart.adjustable'] && RG.Registry.Get('chart.adjusting') && RG.Registry.Get('chart.adjusting').uid == this.uid) {
                this.value = this.getValue(e);
                RG.Clear(ca);
                RG.RedrawCanvas(ca);
                RG.FireCustomEvent(this, 'onadjust');
            }
        };




        /**
        * This method returns the appropriate angle for a value
        * 
        * @param number value The value to get the angle for
        */
        this.getAngle = function (value)
        {
            if (value < this.min || value > this.max) {
                return null;
            }
            
            var angle  = ((value - this.min) / (this.max - this.min)) * RG.HALFPI
                angle += (RG.PI + RG.HALFPI);
                
            return angle;
        };
    
    
    
        /**
        * This allows for easy specification of gradients
        */
        this.parseColors = function ()
        {
            // Save the original colors so that they can be restored when the canvas is reset
            if (this.original_colors.length === 0) {
                this.original_colors['chart.colors.ranges'] = RG.array_clone(prop['chart.colors.ranges']);
                this.original_colors['chart.green.color']   = RG.array_clone(prop['chart.green.color']);
                this.original_colors['chart.yellow.color']  = RG.array_clone(prop['chart.yellow.color']);
                this.original_colors['chart.red.color']     = RG.array_clone(prop['chart.red.color']);
            }

            if (!RG.is_null(prop['chart.colors.ranges'])) {
                for (var i=0; i<prop['chart.colors.ranges'].length; ++i) {
                    prop['chart.colors.ranges'][i][2] = this.parseSingleColorForGradient(prop['chart.colors.ranges'][i][2]);
                }
            } else {
                prop['chart.green.color']  = this.parseSingleColorForGradient(prop['chart.green.color']);
                prop['chart.yellow.color'] = this.parseSingleColorForGradient(prop['chart.yellow.color']);
                prop['chart.red.color']    = this.parseSingleColorForGradient(prop['chart.red.color']);
            }
        };




        /**
        * This parses a single color value
        */
        this.parseSingleColorForGradient = function (color)
        {
            if (!color || typeof(color) != 'string') {
                return color;
            }
    
            if (color.match(/^gradient\((.*)\)$/i)) {
    
                var parts = RegExp.$1.split(':');
    
                var radius_start = this.radius - 54 - prop['chart.text.size'];
                var radius_end   = radius_start - 15;
    
                // Create the gradient
                var grad = co.createRadialGradient(this.centerx, this.centery, radius_start, this.centerx, this.centery, radius_end);
    
    
                var diff = 1 / (parts.length - 1);
    
                grad.addColorStop(0, RG.trim(parts[0]));
    
                for (var j=1,len=parts.length; j<len; ++j) {
                    grad.addColorStop(j * diff, RG.trim(parts[j]));
                }
            }
    
            return grad ? grad : color;
        };




        /**
        * Using a function to add events makes it easier to facilitate method chaining
        * 
        * @param string   type The type of even to add
        * @param function func 
        */
        this.on = function (type, func)
        {
            if (type.substr(0,2) !== 'on') {
                type = 'on' + type;
            }
            
            this[type] = func;
    
            return this;
        };




        /**
        * This function runs once only
        * (put at the end of the file (before any effects))
        */
        this.firstDrawFunc = function ()
        {
        };








        /**
        * CornerGauge Grow
        * 
        * This effect gradually increases the represented value
        * 
        * @param object   obj The chart object
        * @param              Not used - pass null
        * @param function     An optional callback function
        */
        this.grow = function ()
        {
            var opt       = arguments[0];
            var callback  = arguments[1];
            var numFrames = 30;
            var frame     = 0;
            var obj       = this;
    
            // Single pointer
            if (typeof this.value === 'number') {
    
                var origValue = Number(this.currentValue);
                
                if (this.currentValue === null) {
                    this.currentValue = this.min;
                    origValue = this.min;
                }
        
                var newValue  = this.value;
                var diff      = newValue - origValue;
                var step      = (diff / numFrames);
                var frame     = 0;
        
    
                var iterator = function ()
                {
                    frame++;

                    obj.value = ((frame / numFrames) * diff) + origValue
    
                    if (obj.value > obj.max) obj.value = obj.max;
                    if (obj.value < obj.min) obj.value = obj.min;
        
                    RGraph.Clear(obj.canvas);
                    RGraph.RedrawCanvas(obj.canvas);
        
                    if (frame < 30) {
                        RGraph.Effects.updateCanvas(iterator);
                    } else if (typeof callback === 'function') {
                        callback(obj);
                    }
                };
    
                iterator();
    
            // Multiple pointers
            } else {
    
                if (obj.currentValue == null) {
                    obj.currentValue = [];
                    
                    for (var i=0,len=obj.value.length; i<len; ++i) {
                        obj.currentValue[i] = obj.min;
                    }
                    
                    origValue = RG.array_clone(obj.currentValue);
                }
    
                var origValue = RG.array_clone(obj.currentValue);
                var newValue  = RG.array_clone(obj.value);
                var diff      = [];
                var step      = [];
                
                for (var i=0,len=newValue.length; i<len; ++i) {
                    diff[i] = newValue[i] - Number(obj.currentValue[i]);
                    step[i] = (diff[i] / numFrames);
                }
                
                var max = this.max;
                var min = this.min;
    
    
    
                var iterator = function ()
                {
                    frame++;
                    
                    for (var i=0,len=obj.value.length; i<len; ++i) {
                        
                        obj.value[i] = ((frame / numFrames) * diff[i]) + origValue[i];
    
                        if (obj.value[i] > max) obj.value[i] = max;
                        if (obj.value[i] < min) obj.value[i] = min;
            
                        RG.clear(obj.canvas);
                        RG.redrawCanvas(obj.canvas);
                        
                    }
        
                    if (frame < 30) {
                        RG.Effects.updateCanvas(iterator);
                    } else if (typeof callback === 'function') {
                        callback(obj);
                    }
                };
        
                iterator();
            }
            
            return this;
        }




        /**
        * Register the object
        */
        RG.Register(this);
    };