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
			cache: true,
			success: function(data) {
				$('#iplogdata').data('pagenum', iPage);
				var sHtml = '';
				$.each(data, function(index, value) {
					var sTimestamp = value.ts;
					sTimestamp = sTimestamp.replace(/T/, ' ').replace(/\..+/, '');
					sHtml += '<tr data-id="'+value.id+'">';
					sHtml += '<td>'+sTimestamp+'</td>';
					sHtml += '<td>'+value.ipv4+'</td>';
					sHtml += '<td>'+value.ipv6+'</td>';
					sHtml += '</tr>';
				});
				$('#iplogdata tbody').html(sHtml);
				$('#iplogdata caption span').text(parseInt(iPage+1));
			}
		});
	}

	$('#iplogdata').each(function(i) {
		paginate(0);
	}); // on load fill
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

	$('#calendar').fullCalendar({
		firstDay: 1,
		events: {
			url: '/my/calenderevents',
			cache: true
		},
		eventLimit: 4,
		defaultView: 'month',
		views: {
			day: {
				eventLimit: false
			}
		},
		eventLimitClick: 'day',
		header: {
			left: 'title',
			center: 'month basicWeek basicDay',
			right: 'today prev,next'
		},
		locale: 'de',
		eventClick: function(calEvent, jsEvent, view) {
			var oDate = new Date(calEvent.start);
			var sDate = oDate.toISOString();
			sDate = sDate.replace(/T/, ' ').replace(/\..+/, '');
			$('#eventmodal_ts').text(sDate);
			$('#eventmodal_ipv4').text(calEvent.ipv4);
			$('#eventmodal_ipv6').text(calEvent.ipv6);
			$('#eventmodal').modal();
		}
    });

	$('form#loginform input#email').on('keyup', function(e) {
		var sTmp = $(this).val();
		if(sTmp.length < 3) {
			$('#nameStatus').html('<span class="glyphicon glyphicon-ban-circle" aria-hidden="true"></span>');
			return;
		} // if

		$('#nameStatus').html('<span class="glyphicon glyphicon-refresh" aria-hidden="true"></span>').removeClass('btn-danger btn-success');
		$.ajax({
				method: "GET",
				url: '/u/unique',
				data: { search: sTmp },
				timeout: 500,
				cache: false,
				success: function(data) {
					if("OK" === data) {
						$('#nameStatus').html('<span class="glyphicon glyphicon-ok-circle" aria-hidden="true"></span>').removeClass('btn-danger').addClass('btn-success');
					} else {
						$('#nameStatus').html('<span class="glyphicon glyphicon-ban-circle" aria-hidden="true"></span>').removeClass('btn-success').addClass('btn-danger');
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

	// profile subdomain check
	$('form#profilform input#subdomain').on('keyup', function(e) {
		var sTmp = $(this).val();
		if(sTmp.length < 3) {
			$('#nameStatus').html('<span class="glyphicon glyphicon-ban-circle" aria-hidden="true"></span>');
			return;
		} // if

		$('#nameStatus').html('<span class="glyphicon glyphicon-refresh" aria-hidden="true"></span>').removeClass('btn-danger btn-success');
		$.ajax({
				method: "GET",
				url: '/my/subdomainunique',
				data: { search: sTmp },
				timeout: 500,
				cache: false,
				success: function(data) {
					if("OK" === data) {
						$('#nameStatus').html('<span class="glyphicon glyphicon-ok-circle" aria-hidden="true"></span>').removeClass('btn-danger').addClass('btn-success');
					} else {
						$('#nameStatus').html('<span class="glyphicon glyphicon-ban-circle" aria-hidden="true"></span>').removeClass('btn-success').addClass('btn-danger');
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

	// profile passwd check
	$('form#profilform input#password, form#profilform input#password2').on('keyup', function(e) {
		var sTmp1 = $('form#profilform input#password').val();
		var sTmp2 = $('form#profilform input#password2').val();

		if(sTmp1 !== sTmp2) {
			$('#pwd1Status, #pwd2Status').html('<span class="glyphicon glyphicon-ban-circle" aria-hidden="true"></span>').removeClass('btn-success').addClass('btn-danger');
		} else {
			$('#pwd1Status, #pwd2Status').html('<span class="glyphicon glyphicon-ok-circle" aria-hidden="true"></span>').removeClass('btn-danger').addClass('btn-success');
		} // if
	});
});