/*
 * jQuery gentleSelect plugin
 * http://shawnchin.github.com/jquery-gentleSelect
 *
 * Copyright (c) 2010 Shawn Chin. 
 * Licensed under the MIT license.
 * 
 * Usage:
 *  (JS)
 *
 *  $('#myselect').gentleSelect(); // default. single column
 * 
 * $('#myselect').gentleSelect({ // 3 columns, 150px wide each
 *    itemWidth : 150,
 *    columns   : 3,
 * });
 * 
 *  (HTML)
 *  <select id='myselect'><options> .... </options></select>
 *
 */
(function($) {
    
    const defaults = {
        minWidth  : 100, // only applies if columns and itemWidth not set
        itemWidth : undefined,
        columns   : undefined,
        rows      : undefined,
        title     : undefined,
        prompt    : "Make A Selection",
        maxDisplay: 0,  // set to 0 for unlimited
        openSpeed       : 400,
        closeSpeed      : 400,
        openEffect      : "slide",
        closeEffect     : "slide",
        disallowEmpty   : false,
        hideOnMouseOut  : true
    };

    function defined(obj) {
        if (typeof obj == "undefined") { return false; }
        else { return true; }
    }

    function hasError(c, o) {
        if (defined(o.columns) && defined(o.rows)) {
            $.error("gentleSelect: You cannot supply both 'rows' and 'columns'");
            return true;
        }
        if (defined(o.columns) && !defined(o.itemWidth)) {
            $.error("gentleSelect: itemWidth must be supplied if 'columns' is specified");
            return true;
        }
        if (defined(o.rows) && !defined(o.itemWidth)) {
            $.error("gentleSelect: itemWidth must be supplied if 'rows' is specified");
            return true;
        }
        if (!defined(o.openSpeed) || typeof o.openSpeed != "number" && 
                (typeof o.openSpeed == "string" && (o.openSpeed != "slow" && o.openSpeed != "fast"))) { 
            $.error("gentleSelect: openSpeed must be an integer or \"slow\" or \"fast\"");
            return true;
        }
        if (!defined(o.closeSpeed) || typeof o.closeSpeed != "number" && 
                (typeof o.closeSpeed == "string" && (o.closeSpeed != "slow" && o.closeSpeed != "fast"))) { 
            $.error("gentleSelect: closeSpeed must be an integer or \"slow\" or \"fast\"");
            return true;
        }
        if (!defined(o.openEffect) || (o.openEffect != "fade" && o.openEffect != "slide")) {
            $.error("gentleSelect: openEffect must be either 'fade' or 'slide'!");
            return true;
        }
        if (!defined(o.closeEffect)|| (o.closeEffect != "fade" && o.closeEffect != "slide")) {
            $.error("gentleSelect: closeEffect must be either 'fade' or 'slide'!");
            return true;
        }
        if (!defined(o.hideOnMouseOut) || (typeof o.hideOnMouseOut != "boolean")) {
            $.error("gentleSelect: hideOnMouseOut must be supplied and either \"true\" or \"false\"!");
            return true;
        }
        return false;
    }

    function optionOverrides(c, o) {
        if (c.attr("multiple")) {
            o.hideOnMouseOut = true; // must be true or dialog will never hide
        }
    }

    function getSelectedAsText(elemList, opts) { 
        // If no items selected, return prompt
        if (elemList.length < 1) { return opts.prompt; }

        // Truncate if exceed maxDisplay
        if (opts.maxDisplay != 0 && elemList.length > opts.maxDisplay) {
            let arr = elemList.slice(0, opts.maxDisplay).map(function(){return $(this).text();});
            arr.push("...");
            return arr.get().join(", ");
        } else {
            let arr = elemList.map(function(){return $(this).text();});
            return arr.get().join(", ");
        }
    }
    
    function updateState(c, o) {
        const cElem = $(c);
        if (cElem.attr("multiple") && o.disallowEmpty) { 
            const all_items = cElem.data("dialog").find("li"),
                  selected_items = all_items.filter(".selected");
                    
            // mark element if only one selected
            all_items.removeClass("sole-selected");
            if (selected_items.length == 1) {
              selected_items.addClass("sole-selected");
            }
        }
    }

    const methods = {
        init : function(options) {
            const o = $.extend({}, defaults, options),
                  select_items = this.find("option");

            if (hasError(this, o)) { return this; } // check for errors
            optionOverrides(this, o); 
            
            // Handle absolute positioning for select element and create label accordingly
            const selectElement = this;
            let selectTop = selectElement.css("top");
            let selectLeft = selectElement.css("left");
            const selectWidth = selectElement.outerWidth();
            const selectHeight = selectElement.outerHeight();
            const selectPosition = selectElement.css("position");

            if (selectTop === "auto") {
                selectTop = selectElement.offset().top + "px";
            }
            if (selectLeft === "auto") {
                selectLeft = selectElement.offset().left + "px";
            }

            selectElement.hide(); // Hide original select box

            if (this.attr("multiple") && o.disallowEmpty) {
                if (select_items.length == 0) {
                    $.error("gentleSelect: disallowEmpty conflicts with empty <select>");
                }
                // default to first item if none selected
                if (this[0].selectedIndex < 0) { this[0].selectedIndex = 0; }
            }
            
            // Initialise <span> to replace select box with proper positioning
            const labelText = getSelectedAsText(this.find(":selected"), o);
            const label = $("<span class='gentleselect-label'>" + labelText + "</span>")
                .insertBefore(this)
                .on("mouseenter.gentleselect", event_handlers.labelHoverIn)
                .on("mouseleave.gentleselect", event_handlers.labelHoverOut)
                .on("click.gentleselect", event_handlers.labelClick)
                .data("root", this)
                .css({
                    position: selectPosition === "absolute" ? "absolute" : "relative",
                    top: selectTop,
                    left: selectLeft,
                    width: selectWidth,
                    display: "inline-block"
                });
            this.data("label", label)
                .data("options", o);
            
            // Generate list of options
            const ul = $("<ul></ul>");
            select_items.each(function() { 
                const li = $("<li>" + $(this).text() + "</li>")
                    .data("value", $(this).attr("value"))
                    .data("name", $(this).text())
                    .appendTo(ul);
                if ($(this).attr("selected")) { li.addClass("selected"); } 
            });

            // Build dialog box
            const dialog = $("<div class='gentleselect-dialog'></div>")
                .append(ul)
                .insertAfter(label)
                .bind("click.gentleselect", event_handlers.dialogClick)
                .bind("mouseleave.gentleselect", event_handlers.dialogHoverOut)
                .data("label", label)
                .data("root", this);
            this.data("dialog", dialog);
           
            // If to be displayed in columns
            if (defined(o.columns) || defined(o.rows)) {

                // Update CSS
                ul.css("float", "left")
                    .find("li").width(o.itemWidth).css("float","left");
                    
                const f = ul.find("li:first");
                const actualWidth = o.itemWidth 
                    + parseInt(f.css("padding-left")) 
                    + parseInt(f.css("padding-right"));
                const elemCount = ul.find("li").length;
                let cols, rows;
                if (defined(o.columns)) {
                    cols = parseInt(o.columns);
                    rows = Math.ceil(elemCount / cols);
                } else {
                    rows = parseInt(o.rows);
                    cols = Math.ceil(elemCount / rows);
                }
                dialog.width(actualWidth * cols);

                // Add padding
                for (let i = 0; i < (rows * cols) - elemCount; i++) {
                    $("<li style='float:left' class='gentleselect-dummy'><span>&nbsp;</span></li>").appendTo(ul);
                }

                // Reorder elements
                const ptr = [];
                let idx = 0;
                ul.find("li").each(function() {
                    if (idx < rows) { 
                        ptr[idx] = $(this); 
                    } else {
                        const p = idx % rows;
                        $(this).insertAfter(ptr[p]);
                        ptr[p] = $(this);
                    }
                    idx++;
                });
            } else if (typeof o.minWidth == "number") {
                dialog.css("min-width", o.minWidth);
            }

            if (defined(o.title)) {
                $("<div class='gentleselect-title'>" + o.title + "</div>").prependTo(dialog);
            }

            // ESC key should hide all dialog boxes
            $(document).bind("keyup.gentleselect", event_handlers.keyUp);

            updateState(this, o);
            return this;
        },

        // if select box was updated externally, we need to bring everything
        // else up to speed.
        update : function() {
            const opts = this.data("options");

            // Update li with selected data
            const v = (this.attr("multiple") && this.val()) ? this.val() : [this.val()];
            $("li", this.data("dialog")).each(function() {
                const $li = $(this);
                const isSelected = ($.inArray($li.data("value"), v) != -1);
                $li.toggleClass("selected", isSelected);
            });

            // Update label
            const label = getSelectedAsText(this.find(":selected"), opts);
            this.data("label").text(label);
            
            updateState(this, opts);
            return this;
        },
        
        // clear all selections
        clear : function() {
            // Check for disallowEmpty option
            if (this.data("options").disallowEmpty) {
              $.error("gentleSelect: cannot use 'clear' when disallowEmpty=true");
              return this;
            }

            // Deselect all options.
            // http://www.w3.org/TR/DOM-Level-2-HTML/html.html#ID-85676760
            this[0].selectedIndex = -1;

            // Update dialog
            return methods["update"].call(this);
        }
    };

    const event_handlers = {

        labelHoverIn : function() { 
            $(this).addClass('gentleselect-label-highlight'); 
        },

        labelHoverOut : function() { 
            $(this).removeClass('gentleselect-label-highlight'); 
        },

        labelClick : function() {
            const $this = $(this);
            const pos = $this.position();
            const root = $this.data("root");
            const opts = root.data("options");
            const dialog = root.data("dialog")
                .css("top", pos.top + $this.height())
                .css("left", pos.left + 1);
            if (opts.openEffect == "fade") {
                dialog.fadeIn(opts.openSpeed);
            } else {
                dialog.slideDown(opts.openSpeed);
            }
        },
    
        dialogHoverOut : function() {
            const $this = $(this);
            if ($this.data("root").data("options").hideOnMouseOut) {
                $this.hide();
            }
        },

        dialogClick : function(e) {
            const clicked = $(e.target);
            const $this = $(this);
            const root = $this.data("root");
            const opts = root.data("options");
            if (!root.attr("multiple")) {
                if (opts.closeEffect == "fade") {
                    $this.fadeOut(opts.closeSpeed);
                } else {
                    $this.slideUp(opts.closeSpeed);
                }
            }

            if (clicked.is("li") && !clicked.hasClass("gentleselect-dummy")) {
                const value = clicked.data("value");
                const name = clicked.data("name");
                const label = $this.data("label");

                if ($this.data("root").attr("multiple")) {
                    if (opts.disallowEmpty 
                          && clicked.hasClass("selected") 
                          && (root.find(":selected").length == 1)) {
                        // sole item clicked. For now, do nothing.
                        return;
                    }
                    clicked.toggleClass("selected");
                    const s = $this.find("li.selected");
                    label.text(getSelectedAsText(s, opts));
                    const v = s.map(function(){ return $(this).data("value"); });
                    // update actual selectbox and trigger change event
                    root.val(v.get()).trigger("change");
                    updateState(root, opts);
                } else {
                    $this.find("li.selected").removeClass("selected");
                    clicked.addClass("selected");
                    label.text(clicked.data("name"));
                    // update actual selectbox and trigger change event
                    root.val(value).trigger("change");
                }
            }
        },

        keyUp : function(e) {
            if (e.keyCode == 27 ) { // ESC
                $(".gentleselect-dialog").hide();
            }
        }
    };

    $.fn.gentleSelect = function(method) {
        if (methods[method]) {
            return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
        } else if (typeof method === 'object' || ! method) {
            return methods.init.apply(this, arguments);
        } else {
            $.error( 'Method ' +  method + ' does not exist on jQuery.gentleSelect' );
        }   
    };

})(jQuery);
