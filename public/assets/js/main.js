/*globals document:false */
/*globals $iq:false */
/*globals Strophe:false */
/*jshint devel:true */
/*jshint jquery:true */
/*jshint esversion: 6*/


$(document).ready(function() {

	function paginate(iPage) {
		var iPageLen = $('#iplogdata').data('pagelen');
		$.ajax({
			method: "GET",
			url: '/my/entries/'+iPageLen+'/'+iPage,
			timeout: 500,
			cache: false,
			success: function(data) {
				$('#iplogdata').data('pagenum', iPage);
				var sHtml = '';
				$.each(data, function(index, value) {
					sHtml += '<tr data-id="'+value.id+'">';
					sHtml += '<td>'+value.ts+'</td>';
					sHtml += '<td>'+value.ipv4+'</td>';
					sHtml += '<td>'+value.ipv6+'</td>';
					sHtml += '</tr>';
				});
				$('#iplogdata tbody').html(sHtml);
			}
		});
	}

	$('#btnprev').click(function() {
		var iPage = $('#iplogdata').data('pagenum');
		iPage -= 1;
		if(iPage<0) {
			iPage=0;
		} // if
		paginate(iPage);
		return false; // prevent default
	});

	$('#btnnext').click(function() {
		var iPage = $('#iplogdata').data('pagenum');
		iPage += 1;
		paginate(iPage);
		return false; // prevent default
	});

/*
	$('#name').on('keyup', function(e){
		var sTmp = $(this).val();
		if(sTmp.length < 3) {
			$('#nameStatus').html('<span class="glyphicon glyphicon-ban-circle" aria-hidden="true"></span>');
			return;
		} // if

		$('#nameStatus').html('<span class="glyphicon glyphicon-refresh" aria-hidden="true"></span>');
		$.ajax({
				method: "GET",
				url: '/u/unique',
				data: { search: sTmp },
				timeout: 500,
				cache: false,
				success: function(data) {
					if("OK" === data) {
						$('#nameStatus').html('<span class="glyphicon glyphicon-ok-circle" aria-hidden="true"></span>');
					} else {
						$('#nameStatus').html('<span class="glyphicon glyphicon-ban-circle" aria-hidden="true"></span>');
					}
				}, // function success
				error: function(jqXHR, textStatus, errorThrown) {
					$('#nameStatus').html('?');
					if('timeout' !== textStatus) {
						alert('error '+textStatus+errorThrown);
					} // if
				} // function error
		}); // ajax
	}); // function keyout
*/

});