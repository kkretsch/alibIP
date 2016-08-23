$(document).ready(function() {

	$('#name').on('keyup', function(e){
//	if(e.keyCode === 13) {
		var parameters = { search: $(this).val() };
			$.get( '/u/unique', parameters, function(data) {
				$('#nameStatus').html(data);
			});
//		};
	});

});