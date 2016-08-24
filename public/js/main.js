var cVocab = {
	connection: null,
	start_time: null,

	log: function (msg) {
        $('#log').append("<p>" + msg + "</p>");
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

        cVocab.connection.disconnect();
        
        return false;
    }
}; // class

$(document).bind('connected', function () {
	cVocab.log("Connection established.");
    cVocab.connection.addHandler(cVocab.handle_pong, null, "iq", null, "ping1");
    var domain = Strophe.getDomainFromJid(cVocab.connection.jid);
    cVocab.send_ping(domain);
});

$(document).bind('disconnected', function () {
	cVocab.log("Connection terminated.");
    cVocab.connection = null;
});


$(document).ready(function() {

	$('#loginform').submit(function(event) {
		var sJid = $('#lname').val();
		var sPwd = $('#pwd').val();

		event.preventDefault();
		var conn = new Strophe.Connection("http://vocab.guru:5280/http-bind");
		conn.connect(sJid, sPwd, function (status) {
			if (status === Strophe.Status.CONNECTED) {
				$(document).trigger('connected');
			} else if (status === Strophe.Status.DISCONNECTED) {
				$(document).trigger('disconnected');
			} // if
		});

	    cVocab.connection = conn;
	});
	
	$('#name').on('keyup', function(e){
		var sTmp = $(this).val();
		if(sTmp.length < 3) {
			$('#nameStatus').html('...');
			return;
		} // if

		$.ajax({
				method: "GET",
				url: '/u/unique',
				data: { search: sTmp },
				timeout: 500,
				cache: false,
				success: function(data) {
					$('#nameStatus').html(data);
				}, // function success
				error: function(jqXHR, textStatus, errorThrown) {
					$('#nameStatus').html('?');
					if('timeout' != textStatus) {
						alert('error '+textStatus+errorThrown);
					} // if
				} // function error
		}); // ajax
	}); // function keyout

});