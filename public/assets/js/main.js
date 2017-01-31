/*globals document:false */
/*globals $iq:false */
/*globals Strophe:false */
/*jshint devel:true */
/*jshint jquery:true */
/*jshint esversion: 6*/


$(document).ready(function() {



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

	$('input.vocabAnswer').on('click', function(e) {
		var idQ = $('#vocabQuestion').data('id');
		var idA = $(this).data('id');
		if(idA === idQ) {
			$(this).addClass('btn-success');
			cVocab.send_status('Ist OK');
		} else {
			$(this).addClass('btn-danger');
			cVocab.send_status('Ist falsch');
		}
	});
	$('button#btnrepeat').on('click', function(e) {
		var languagesslug = $('body').data('languages');
		var parameters = {};
		$.get('/api/' + languagesslug + '/ask', parameters, function(data) {
			var sWord = data.vcardfrom.txtfrom;
			_paq.push(['setDocumentTitle', $(document).prop('title') + ' - ' + sWord]);
			_paq.push(['setCustomUrl', window.location.href + '#' + encodeURI(sWord)]);
			_paq.push(['trackPageView']);

			$('#vocabQuestion')
				.text(sWord)
				.data('id', data.vcardfrom.id);
			$('input.vocabAnswer').each(function(i) {
				$(this)
					.attr('value', data.vcardto[i].txtto)
					.data('id', data.vcardto[i].id)
					.removeClass('btn-success btn-danger');
			});
		});
		
	});	
});