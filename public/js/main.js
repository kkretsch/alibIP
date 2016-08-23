$(document).ready(function() {

	$('#name').on('keyup', function(e){
//	if(e.keyCode === 13) {
		var sTmp = $(this).val();
		if(sTmp.length < 3) return;
		var parameters = { search: sTmp };
			$.get( '/u/unique', parameters, function(data) {
				$('#nameStatus').html(data);
			});
//		};
	});

});