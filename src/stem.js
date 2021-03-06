(function(){
    // pooling a function
    var waitForFunc = function(name, maxttries, successCb) {
        var found = (typeof(window[name])=='function'); 
        if(found) {
            successCb && successCb();
        } else if(maxttries > 0) {
            window.setTimeout(function() {
                var found = (typeof(window["name"])=='function');
                if(found) {
                    successCb && successCb();
                } else {
                    waitForFunc(name, maxttries-1, successCb);
                }
            }, 250);
        } else {
            console.error("Cannot wait for function ", name);
        }
    };
    var createLinkSheet = function(href, id) {
        if(document.querySelector('#'+id)) {
            // Already loaded 
            return;
        }
        var link = document.createElement('link');
        link.rel = 'stylesheet';
        link.type = 'text/css';
        link.href = href;
        if(id) {
            link.id = id;
        }
        document.getElementsByTagName('head')[0].appendChild(link);
    };
    // Dependency loader
    var jsLoader = function(src, id, cb) {
        if(document.querySelector('#'+id)) {
            // Already loaded
            cb && cb();
            return;
        }
        var scriptElem = document.createElement('script'); 
        scriptElem.src = src;
        scriptElem.async = false;
        if(id) {
            scriptElem.id = id;
        }
        if(cb) {
            scriptElem.onload = function() {
                cb();
            };
        }
        document.getElementsByTagName('head')[0].appendChild(scriptElem);
    };

    // -->  Gràfics de JSXG
    var onreadyJSXG = function (componentContainers) {
        if(window.MathJax) {
            JXG.Options.text.useMathJax = true;
        }
        var COMPONENT_NAME = "jsxg";
        if (window.IB.sd[COMPONENT_NAME]) {
            // Already loaded in page
            // Bind any remaining component
            console.error("Warning: " + COMPONENT_NAME + " loaded twice.");
            window.IB.sd[COMPONENT_NAME].bind && window.IB.sd[COMPONENT_NAME].bind();
            return;
        } 
        
        // Converteix la llista1 --> llista2 per aplicació de la funció cb
        var mapa = function(lst, cb) {
            var lst2 = [];
            for(var i=0, len=lst.length; i<len; i++) {
                lst2.push(cb(lst[i]));
            }
            return lst2;
        };
    
        // Retorna una part d'una cadena
        var partStr = function(lst, i) {
            if(i < lst.length) {
                return lst[i].trim();
            }
            return null;
        };
    
        // Returns integer from element i of list
        var partInt = function(lst, i) {
            var tmp = partStr(lst, i);
            if(tmp != null) {
                return parseInt(tmp);
            }
            return null;
        };
    
        // Returns float from element i of list 
        var partFloat = function(lst, i) {
            var tmp = partStr(lst, i);
            if(tmp != null) {
                return parseFloat(tmp);
            }
            return null;
        };
    
    
        var Plotme = function(elem) {
            var self = this;
            this._elem = elem;
            if(!elem.classList.contains("jxgbox")) {
                elem.classList.add("jxgbox");
            }
            var ds = elem.dataset;
            this.bb = [-5,5,5,-5];
            if(ds.pltBb) {
                var parts = ds.pltBb.split(",");
                parts = mapa(parts, function(e){return parseFloat(e);});
                if(parts.length == 2) {
                    this.bb = [-parts[0], parts[1], parts[0], -parts[1]];
                } else if(parts.length >= 4) {
                    this.bb = [parts[0], parts[3], parts[1], parts[2]];
                }
            }
            this.id = elem.id;
             // Look for jessiecode
             var codiElem = elem.querySelector('script[type="text/jessiecode"]');
             var codi = null;
             if(codiElem) {
                 var codi = codiElem.innerText;
                 codi = codi.replace(/\[\[\[/g, '<<').replace(/\]\]\]/g, '>>');
             }
            this.board = JXG.JSXGraph.initBoard(this.id, {boundingbox: this.bb, axis: true, showCopyright: false});
            if(codi) {
                self.board.jc.parse(codi);
            }
    
            if(ds.pltFun) {
                var parts = ds.pltFun.split("::");
                parts = mapa(parts, function(e){
                    var parts2 = e.split(",");
                    return {
                        expr: partStr(parts2, 0),
                        name: partStr(parts2, 1),
                        color: partStr(parts2, 2),
                        width: partInt(parts2, 3)
                    }
                });
                for(var i=0; i<parts.length; i++) {
                    var dd = parts[i];
                    //console.error(dd);
                    this.drawFunction(dd.expr, dd.name, dd.color, dd.width);
                }
            }
    
            if(ds.pltPoint) {
                var parts = ds.pltPoint.split("::");
                parts = mapa(parts, function(e){
                    var parts2 = e.split(",");
                    return {
                        x: partFloat(parts2, 0),
                        y: partFloat(parts2, 1),
                        name: partStr(parts2, 2),
                        color: partStr(parts2, 3),
                        size: partInt(parts2, 4)
                    }
                });
                for(var i=0; i<parts.length; i++) {
                    var dd = parts[i]; 
                    this.drawPoint(dd.x, dd.y, dd.name, dd.color, dd.size);
                }
            }
    
            if(ds.pltBetween) {
                var parts = ds.pltBetween.split(",");
                parts = mapa(parts, function(e){
                    // Retrieve object from board
                    return JXG.getReference(self.board, e.trim());
                }); 
                this.drawBetween(parts[0], parts[1]); 
            }
    
            self.board.update();
        };
        Plotme.prototype = {
            drawFunction: function(expr, name, color, width) {
                color = color || "blue";
                width = width || 2;
                var parsed = Parser.parse(expr);
                var lfn = function(x) {
                    return parsed.evaluate({x: x});
                };
                return this.board.create('functiongraph', [lfn], {strokeWidth: width, name: name, strokeColor: color});
            },
            drawPoint: function(x, y, name, color, size) {
                color = color || "blue";
                size = size || 3;
                return this.board.create('point', [x,y], {size: size, name: name, fixed:true, fillColor: color, strokeColor: color});
            },
            drawBetween: function(f, g) {
                var region = this.board.create('curve', [[], []], {strokeWidth:0, fillColor:'orange', fillOpacity: 0.3});
                region.updateDataArray = function() { 
                        // Start with (0, 0)
                        this.dataX = [0];
                        this.dataY = [0];
                        
                        // Copy all points from f2
                        this.dataX = this.dataX.concat( mapa(f.points, function(p){ return p.usrCoords[1];} ) );
                        this.dataY = this.dataY.concat( mapa(f.points, function(p){ return p.usrCoords[2];}) );
                        
                        // Copy all points from g2
                        this.dataX = this.dataX.concat( mapa(g.points, function(p){ return p.usrCoords[1];} ) );
                        this.dataY = this.dataY.concat( mapa(g.points, function(p){ return p.usrCoords[2];}) );
                    
                        // Close curve (TODO: Check if correctly closed)
                        this.dataX = this.dataX.concat( f.points[0].usrCoords[1] );
                        this.dataY = this.dataY.concat( f.points[0].usrCoords[2] );
                }
            },
            getBoard: function() {
                return this.board;
            }
        };
     
        var alias = { author: "Josep Mulet", version: "1.0", inst: {} };
        window.IB.sd[COMPONENT_NAME] = alias;
        var bind = function() {
            // Crea una instància de la classe anterior per a cadascun dels components trobats en la pàgina
            for(var i=0, len=componentContainers.length; i<len; i++) {
                var container = componentContainers[i];
                // Evita que un contenidor pugui ésser tractat més d'una vegada degut a múltiples insercions de la llibreria
                if(container.dataset.active) {
                    continue;
                }
                container.dataset.active = "1";
               
                // Exposa l'objecte a window per si es volgués emprar la seva API
                // Aquesta seria la forma d'utilitzar comunicació entre components (si fos necessari)
                // s'assegura que el contenidor del component té id, sinó l'assigna
                var id = container.getAttribute("id");
                if(!id) {
                    id = "dynamic_"+Math.random().toString(32).substring(2);
                    container.id = id;
                }
                var instancia = new Plotme(container);
                window.IB.sd[COMPONENT_NAME].inst[id] = instancia;
            }
          
        };
        alias.bind = bind;
        alias.unbind = function() {
            var lInst = Object.values(alias.inst);
            for(var i=0, l=lInst.length; i<l; i++) {
                lInst[i].dispose();
            }
            alias.inst = {};
         };
    
        bind();
    
    
    }; // End module jsxg
    


    // Check if it is required to load dependencies of jsxg?
    var componentContainers = document.querySelectorAll('[role="snptd_jsxg"]');
    if(componentContainers.length) {
        var readyFn1 = function() {
            require(['jsxgraphcore'], function(e){
                // Expose to the window object
                window.JGX = e;
                onreadyJSXG(componentContainers);
        });
            
        };
        // load dependencies
        createLinkSheet("https://cdn.jsdelivr.net/npm/jsxgraph/distrib/jsxgraph.css", "jsxgraph.css");
        waitForFunc("require", 15, function(){
            // JSXG requires requirejs
            jsLoader("https://cdn.jsdelivr.net/npm/jsxgraph/distrib/jsxgraphcore.js", "jsxgraphcore.js", readyFn1);
        });
    }

     // Check if it is required to load dependencies of datatable?
     /*
     var componentContainers = document.querySelectorAll('div[role="snptd_datatable"]');
     if(componentContainers.length) {
        var readyFn2 = function() {
            for(var i=0, len=componentContainers.length; i<len; i++) {
                var elem = $(componentContainers[i]);
                // TODO read from text/Datatable script for csv within elem
                var csvElem = elem.find('script[type="text/Datatable"]');
                console.error(csvElem.text());
                 
                // create a table
                var tid = 'dt_'+ Math.random().toString(32).substring(2);
                var table = $('<table id="'+tid+'" class="display" style="width:100%"></table>');
                var thead = $('<thead><tr><th>Name</th><th>Age</th></tr></thead>'); 
                var tbody = $('<tbody></tbody>');
                var trow1 = $('<tr><td>Mike</td><td>44</td></tr>');
                var trow2 = $('<tr><td>Clara</td><td>14</td></tr>');
                table.append(thead);
                tbody.append(trow1);
                tbody.append(trow2);
                table.append(tbody);
                
                elem.append(table);
                $.DataTable('#'+tid);    
            }
        };
        // load dependencies
        createLinkSheet("https://piworld.es/iedib/DataTables/datatables.min.css", "datatables.css");
        jsLoader("https://piworld.es/iedib/DataTables/datatables.min.js", "datatables.js", readyFn2);
     }
     */
})();
 