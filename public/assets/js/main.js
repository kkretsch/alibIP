/*globals document:false */
/*globals $iq:false */
/*globals Strophe:false */
/*jshint devel:true */
/*jshint jquery:true */

var cVocab = {
	connection: null,
	start_time: null,
	rid: null,
	sid: null,

	log: function (msg) {
        $('#log').append("<p>" + msg + "</p>");
	},

	send_status: function(sMsg) {
		var o = {to:'testroom@conference.vocab.guru', type : 'groupchat'};
		var m = $msg(o); m.c('body', null, sMsg);
		cVocab.connection.send(m.tree());
	},
	
	send_ping: function (to) {
        var ping = $iq({
            to: to,
            type: "get",
            id: "ping1"}).c("ping", {xmlns: "urn:xmpp:ping"});

        cVocab.log("Sending ping to " + to + ".");

        cVocab.start_time = (new Date()).getTime();
        cVocab.connection.send(ping);
    },

    handle_pong: function (iq) {
        var elapsed = (new Date()).getTime() - cVocab.start_time;
        cVocab.log("Received pong from server in " + elapsed + "ms.");

        // cVocab.connection.disconnect();
        
        return false;
    }
}; // class

$(document).bind('connected', function () {
	cVocab.log("Connection established.");
    cVocab.connection.addHandler(cVocab.handle_pong, null, "iq", null, "ping1");
//    var domain = Strophe.getDomainFromJid(cVocab.connection.jid);
//    cVocab.send_ping(domain);
});

$(document).bind('disconnected', function () {
	cVocab.log("Connection terminated.");
    cVocab.connection = null;
});


$(document).ready(function() {

	var sCookieSid = $.cookie('vocabSid');
	var sCookieRid = $.cookie('vocabRid');
	var sCookieJid = $.cookie('vocabJid');
	if(sCookieSid && sCookieRid && sCookieJid) {
		console.log("Connection trying to reestablish");
		var conn = new Strophe.Connection("https://xmpp.vocab.guru:5282/http-bind");
		iRid = parseInt(sCookieRid, 10) + 1;
		$.cookie('vocabRid', iRid, { path: '/' } );
		conn.attach(sCookieJid, sCookieSid, sCookieRid, function(status) {
			switch(status) {
			case Strophe.Status.ERROR:
				console.log("reconnect error");
				break;
			case Strophe.Status.CONNECTING:
				console.log("reconnect connecting");
				break;
			case Strophe.Status.CONNFAIL:
				console.log("reconnect fail");
				break;
			case Strophe.Status.AUTHENTICATING:
				console.log("reconnect authenticating");
				break;
			case Strophe.Status.AUTHFAIL:
				console.log("reconnect authfail");
				break;
			case Strophe.Status.CONNECTED:
				console.log("reconnect connected");
				break;
			case Strophe.Status.DISCONNECT:
				console.log("reconnect disconnected");
				break;
			case Strophe.Status.DISCONNECTING:
				console.log("reconnect disconnecting");
				break;
			case Strophe.Status.ATTACHED:
				cVocab.connection = conn;
				console.log("Connection reestablished.");
				break;
			}
		});
	} // if

	$('#loginform').submit(function(event) {
		var sJid = $('#lname').val() + "@vocab.guru";
		var sPwd = $('#pwd').val();

		event.preventDefault();
		var conn = new Strophe.Connection("https://xmpp.vocab.guru:5282/http-bind");
		conn.xmlOutput = function(e) {
//			if(IS_CONNECTED) {
				cVocab.rid = $(e).attr('rid');
				cVocab.sid = $(e).attr('sid');
				$.cookie("vocabRid", cVocab.rid, { path: '/' } );
				cVocab.log("rid=" + cVocab.rid + ", sid=" + cVocab.sid);
//			} // if
		};
		conn.connect(sJid, sPwd, function (status) {
			if (status === Strophe.Status.CONNECTED) {
				$.cookie("vocabSid", cVocab.sid, { path: '/' } );
				$.cookie("vocabRid", cVocab.rid, { path: '/' } );
				$.cookie("vocabJid", sJid, { path: '/' } );

				console.log('trying to join');

				var sNick = $('#lname').val()
				var o = {to:'testroom@conference.vocab.guru/' + sNick}; 
				var m = $pres(o); 
				m.c('x', {xmlns : 'http://jabber.org/protocol/muc'}, null); 
				conn.send(m.tree());

				console.log('did try to join');

				$(document).trigger('connected');
				var oPwd = $('#pwd').detach();
				$('#secondLoginForm').append(oPwd);
				$('#rid').val(cVocab.rid);
				$('#sid').val(cVocab.sid);
				$('#jid').val(sJid);
				$('#secondLoginForm').submit();
			} else if (status === Strophe.Status.DISCONNECTED) {
				$(document).trigger('disconnected');
			} // if
		});

	    cVocab.connection = conn;
	});

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
	
});