var idSite = 107;
var piwikTrackingApiUrl = 'https://stat.myocastor.de/piwik.php';

var _paq = _paq || [];
_paq.push(['setTrackerUrl', piwikTrackingApiUrl]);
_paq.push(['setSiteId', idSite]);
_paq.push(["setDocumentTitle", document.domain + "/" + document.title]);
_paq.push(["setCookieDomain", "*.vocab.guru"]);
_paq.push(["setDomains", ["*.vocab.guru"]]);
_paq.push(['trackPageView']);
_paq.push(['enableLinkTracking']);