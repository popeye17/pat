var DOM = function() {


	var d3Chart = "d3_workload_container";
	
	var contentIn = function(id) {	
		contentOut();
		document.getElementById(id).style.display="inherit";
		document.getElementById(id).style.position = "relative";
		document.getElementById("graph").appendChild(document.getElementById(id));
		var e = document.getElementById(id);
		e.className = "slide_content contentIn";
		d3Chart = id;

		function contentOut() {
			var e = document.getElementById(d3Chart);
			e.style.position = "absolute";
			e.className = "slide_content contentOut";
			//if ($.browser.msie) $(e).css('display','none');
		}
	}

	var hideContent = function(id) {
		var e;
		id.forEach(function(d){
			e = document.getElementById(d);		
			e.className = "slide_content";
		});	
	}
	
	return {
		contentIn: contentIn,
		hideContent: hideContent
	}
}