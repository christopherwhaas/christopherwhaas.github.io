/**
 * =======================================================
 * jQuery.swap - Swap two DOM with animation
 * Author: Teja Sophista
 * Version: 1.00
 * Date: April 21st, 2012
 * Fork me on GitHub: github.com/tejanium/jquery.swap
 * Dual licensed under the MIT or GPL Version 2 licenses.
 * =======================================================
**/

// (function( $ ) {
// 	$.fn.swap = function(a, b) {
// 	  t = this;
// 	  if(t.length == 1 && a.length == 1 && b == undefined ){
// 		  return _swap(t, a);
// 	  }else if(t.length > 1 && typeof(a) == "number" && typeof(b) == "number" ){
// 		  _swap(t[a], t[b]);
// 		  return t;
// 	  }else{
// 		//   $.error( 'Argument Error!' );
// 	  }
// 	};
  
// 	function _swap(a, b){
// 	  var from = $(a),
// 		  dest = $(b),
// 		  from_pos = from.offset(),
// 		  dest_pos = dest.offset(),
// 		  from_clone = from.clone(),
// 		  dest_clone = dest.clone(),
// 		  total_route_vertical   = dest_pos.top + dest.height() - from_pos.top,
// 		  route_from_vertical    = 0,
// 		  route_dest_vertical    = 0,
// 		  total_route_horizontal = dest_pos.left + dest.width() - from_pos.left,
// 		  route_from_horizontal  = 0,
// 		  route_dest_horizontal  = 0
  
// 	  from.css("opacity", 0);
// 	  dest.css("opacity", 0);
  
// 	  from_clone.insertAfter(from).css({position: "absolute", width: from.outerWidth(), height: from.outerHeight()}).offset(from_pos).css("z-index", "999")
// 	  dest_clone.insertAfter(dest).css({position: "absolute", width: dest.outerWidth(), height: dest.outerHeight()}).offset(dest_pos).css("z-index", "999")
  
// 	  if(from_pos.top != dest_pos.top)
// 		  route_from_vertical = total_route_vertical - from.height()
// 		  route_dest_vertical = total_route_vertical - dest.height()
// 	  if(from_pos.left != dest_pos.left)
// 		  route_from_horizontal = total_route_horizontal - from.width()
// 		  route_dest_horizontal = total_route_horizontal - dest.width()
  
// 	  from_clone.animate({
// 		  top: "+=" + route_from_vertical + "px",
// 		  left: "+=" + route_from_horizontal + "px",
// 		  },
// 		  "slow",
// 		  function(){
// 			  dest.insertBefore(this).css("opacity", 1);
// 			  $(this).remove();
// 	  });
  
// 	  dest_clone.animate({
// 		  top: "-=" + route_dest_vertical + "px",
// 		  left: "-=" + route_dest_horizontal + "px"
// 		  },
// 		  "slow",
// 		  function(){
// 			  from.insertBefore(this).css("opacity", 1);
// 			  $(this).remove();
// 	  });
  
// 	  return from;
// 	}
//   })( jQuery );
  
/*!
 * jQuery Swapsie Plugin
 * Examples and documentation at: http://biostall.com/swap-and-re-order-divs-smoothly-using-jquery-swapsie-plugin
 * Copyright (c) 2010 Steve Marks - info@biostall.com
 * Licensed under the MIT license: http://www.opensource.org/licenses/mit-license.php
 * Version: 1 (09-JULY-2010)
 */

var swapping = false;

(function($) {
    $.fn.extend({
        swap: function(options) {
			
			var defaults = {
			    target: "",
				speed: 1000,
				opacity: "1",
				callback: function() {}
			};
			var options = $.extend(defaults, options);
			
			return this.each(function() {
				
				var obj = $(this);
				
				if (options.target!="" && !swapping) {
					
					swapping = true;
					
					// set primary and secondary elements to relative if not already specified a positon CSS attribute
					var current_primary_pos = obj.css("position");
					var current_secondary_pos = $("#"+options.target).css("position");
					if (current_primary_pos!="relative" && current_primary_pos!="absolute") {
						obj.css("position", "relative");
					}
					if (current_secondary_pos!="relative" && current_secondary_pos!="absolute") {
						$("#"+options.target).css("position", "relative");
					}
					//
					
					// calculate y-axis movement
					var current_primary_position = obj.offset();
					var current_primary_top = current_primary_position.top;
					var current_secondary_position = $("#"+options.target).offset();
					var current_secondary_top = current_secondary_position.top;
					var direction_primary_y = '-';
					var direction_secondary_y = '-';
					if (current_primary_top<=current_secondary_top) { // if primary above secondary 
						var direction_primary_y = '+'; 
						var total_y = current_secondary_top-current_primary_top;
					}else{ // if primary below secondary 
						var total_y = current_primary_top-current_secondary_top;
					}
					if (direction_primary_y=='-') { direction_secondary_y='+'; }else{ direction_secondary_y='-'; }
					//
					
					// calculate x-axis movement
					var current_primary_position = obj.offset();
					var current_primary_left = current_primary_position.left;
					var current_secondary_position = $("#"+options.target).offset();
					var current_secondary_left = current_secondary_position.left;
					var direction_primary_x = '-';
					var direction_secondary_x = '-';
					if (current_primary_left<=current_secondary_left) { // if primary left of secondary 
						var direction_primary_x = '+'; 
						var total_x = current_secondary_left-current_primary_left;
					}else{ // if primary below secondary 
						var total_x = current_primary_left-current_secondary_left;
					}
					if (direction_primary_x=='-') { direction_secondary_x='+'; }else{ direction_secondary_x='-'; }
					//
					
					// do swapping
					obj.animate({
						opacity: options.opacity
					}, 100, function() {
						obj.animate({
							top: direction_primary_y+"="+(total_y)+"px",
							left: direction_primary_x+"="+(total_x)+"px"
						}, options.speed, function() {
							obj.animate({
								opacity: "1"
							}, 100);
						});
					});
					$("#"+options.target).animate({
						opacity: options.opacity
					}, 100, function() {
						$("#"+options.target).animate({
							top: direction_secondary_y+"="+(total_y)+"px",
							left: direction_secondary_x+"="+(total_x)+"px"
						}, options.speed, function() {
							$("#"+options.target).animate({
								opacity: "1"
							}, 100, function() { 
								swapping = false; // call the callback and apply the scope:
    								options.callback.call(this);
 							});
						});
					});
					
				}
				
			});
			
			
        }
    });
})(jQuery);
