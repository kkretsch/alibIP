var idSite = 118;
var piwikTrackingApiUrl = 'https://stat.myocastor.de/piwik.php';

var _paq = _paq || [];
_paq.push(['setTrackerUrl', piwikTrackingApiUrl]);
_paq.push(['setSiteId', idSite]);
_paq.push(["setDocumentTitle", document.domain + "/" + document.title]);
_paq.push(["setCookieDomain", "*.iplog.info"]);
_paq.push(["setDomains", ["*.iplog.info"]]);
_paq.push(['trackPageView']);
_paq.push(['enableLinkTracking']);