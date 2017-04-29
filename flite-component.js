(function() {
	
	// Part definitions

    var PartDefinitions = {};

    PartDefinitions.DefaultValues = {
        config: null,
        rectangle: null,
        component: null,
        layerId: null,

        flite: {

            initialize: function(resources) {
                //console.log("DEFAULT VALUES INIT", resources);
            },

            stateChange: function(stateObj) {
                //console.log("DEFAULT VALUES STATE CHANGE", stateObj);
            }
        }
    };

    PartDefinitions.Condition = {
        config: null,
        rectangle: null,
        component: null,
        layerId: null,

        flite: {

            initialize: function(resources) {
                //console.log("CONDITION INIT", resources);
            },

            stateChange: function(stateObj) {
                //console.log("CONDITION STATE CHANGE", stateObj);
            }
        }
    };

    PartDefinitions.Equation = {
        config: null,
        rectangle: null,
        component: null,
        layerId: null,

        flite: {

            initialize: function(resources) {
                //console.log("EQUATION INIT", resources);
            },

            stateChange: function(stateObj) {
                //console.log("EQUATION STATE CHANGE", stateObj);
            }
        }
    };
	
	// Main component

    return Object({
        // Component Variables
        name: 'Flite Component',
        rectangle: null,
        api: null,
        config: null,
        firstLoad: null,
        metricsHelper: null,
        containers: null,
        partsArray: null,
        mode: null,
        componentStatus: null,

        // API Values
        apiUrl: 'api.domain.com/api/v2/ip.xml?key=',
        xmlHttp: null,
        apiData: null,
        testData: null,
        apiKey: null,
        dataLoaded: false,
        pauseDataDelivery: null,
        orginComponentText: null,
        componentText: null,
        keyValuesArray: [],
        defaultValuesArray: [],

        // Display
        textContainer: null,
        text: null,
        styleSheet: null,
        label: null,
        invalidTags: ["script", "noscript", "iframe", "frameset", "frame", "head", "link", "style"],
        webFontConfigs: [{
            url: 'fonts.googleapis.com/css?family=',
            urlDelim: '+',
            cssDelim: ' ',
            type: 'link'
        }],

        setupConfig: function(resources) {
            var self = this;
            var config = self.config = resources.config;

            // Flite specific...
            self.api = resources.api;
            self.rectangle = resources.rectangle;
            self.label = resources.label;
            self.containers = resources.containers;

            // Use SSL?
            var useSSL = self.api.environment.secure ? 'https://' : 'http://';
            self.apiUrl = useSSL + self.apiUrl;
			
            // Test IP
            var useTestIp = config.getBoolean('use_test_ip');
            var testIP = useTestIp ? '&query=' + config.getValue('test_ip') : '';
			
            // Full URL
            self.apiKey = config.getValue('api_key');
            self.apiUrl = self.apiUrl + self.apiKey + testIP;

            // Toggle display of raw data or formmated text
            self.componentText = self.orginComponentText = config.getValue('component_text') || "";

            // Define component role
            if (self.config.getBoolean('load_ip_data')) {
                self.mode = 'MASTER_MODE';
            } else {
                self.mode = 'SLAVE_MODE';
            }

            self.testData = '<result><registry-company-name>Test Industries</registry-company-name><registry-city>Test City</registry-city><registry-state>TE</registry-state><registry-zip-code nil="true"/><registry-country>Test Country</registry-country><company-name>Test Company</company-name><industry>Test Industry</industry><street-address>1 Test Street</street-address><city>Test City</city><state>TE</state><zip>94103</zip><country>US</country><phone>415-555-555</phone><web-site>google.com</web-site><audience-segment>Audience</audience-segment><ip>173.228.44.216</ip><watch-list><marketing-alias>Hoovers</marketing-alias><industry>Testing</industry><dnb-repname>Emma Watson</dnb-repname><dnb-number>(333)333-3333</dnb-number><dnb-email>emma@dnb.com</dnb-email></watch-list></result>';
        },

        flite: {

            initialize: function(resources) {
                var self = this;

                self.setupConfig(resources);
                self.handleInternalMessages();

            },

            stateChange: function(stateObj) {
                var self = this;

                self.metricsHelper = stateObj.trigger;

                if (stateObj.state === self.api.state.ENABLED) {

					/**************************************************
					** Reset for when parameters get updated in editor
					**************************************************/

                    if (self.textContainer) {
                        self.text.html = "";
                        self.textContainer.removeChild(self.text);
                        self.removeChild(self.textContainer);
                        self.removeChild(self.styleSheet);
                    }

                    if (!self.textContainer) {
                        if (self.config.getBoolean('load_ip_data')) {

                            self.mode = 'MASTER_MODE';

                        } else {

                            self.mode = 'SLAVE_MODE';
                        }

                        self.componentStatus = "ENABLED";

                        self.componentText = self.config.getValue('component_text');

                        self.styleSheet = self.api.dom.getElement("style");
                        self.addChild(self.styleSheet);
                        self.styleSheet.setAttribute("type", "text/css");

                        self.textContainer = self.api.dom.getElement("div");
                        self.addChild(self.textContainer);

                        self.text = self.api.dom.getElement("div");
                        self.text.x(0);
                        self.text.y(0);
                        self.text.width(self.rectangle.width);
                        self.textContainer.addChild(self.text);

                        self.textContainer.x(0);
                        self.textContainer.y(0);
                        self.textContainer.width(self.rectangle.width);
                        self.textContainer.height(self.rectangle.height);

                        if (self.dataLoaded) {
                            self.displayComponentText();
                        } else {
                            self.init();
                        }
                    }

                } else if (stateObj.state === self.api.state.DISABLED) {

                    self.componentStatus = "DISABLED";
                }
            },

            resize: function(rect) {
                var self = this;

                self.rectangle.width = rect.width;
                self.rectangle.height = rect.height;

                self.text.width(rect.width);
                self.textContainer.width(rect.width);
                self.textContainer.height(rect.height);
            },

            parts: {
                "DefaultValues": PartDefinitions.DefaultValues,
                "Condition": PartDefinitions.Condition,
                "Equation": PartDefinitions.Equation
            }
        },

        init: function() {
            var self = this;

            // Master/Slave roles defined
            if (self.mode === 'MASTER_MODE') {
                // Get API data
                self.requestAPIData();

            } else if (self.mode === 'SLAVE_MODE') {
                // Use test data as a placeholder until master data is passed
                self.testAPIData();

                // Send 'message' (data request) to all listening master component instances
                self.api.messenger.send("API_SLAVE_DATA_REQUEST", {
                    data: null
                }, null);
            }
        },

        handleInternalMessages: function() {
            var self = this;

            self.api.messenger.bind("messagereceived", function(messageEvent) {

                switch (messageEvent.message) {

                    case "API_SLAVE_DATA_REQUEST":

                        if (self.mode === "MASTER_MODE") {

                            if (!self.dataLoaded) {

                                self.pauseDataDelivery = true;

                            } else {

                                self.api.messenger.send("API_MASTER_DATA_SENT", {
                                    data: self.apiData
                                }, null);
								
                            }
                        }

                        break;

                    case "API_MASTER_DATA_SENT":

                        if (self.mode === "SLAVE_MODE") {

                            self.apiData = messageEvent.payload.data;

                            if (self.componentStatus === "ENABLED") {

                                self.displayComponentText();

                            } else {

                                self.dataLoaded = true;
                            }

                        }

                        break;
                }
            });
        },

        /************************************************************
         ** Returns an Array of user defined conditions & equations
         ** from their respected parts. This is a simpler data structure
         ** that is easier to follow/read/debug
         **
         ** Example:
         ** conditionsArray = [
         **     {
         **         condition: string,
         **         equations: [
         **             {property: string, operator:string, value: string}
         **         ], etc..
         **     }, etc...
         ** ];
         ***********************************************************/
		
        createConditionsArray: function() {
            var self = this;

            var conditions = self.containers.conditionals && self.containers.conditionals.reverse() || [];
            var conditionsArray = [];
            var currentCondition = 0;

            conditions.forEach(function(condition) {

                var conditionConfig = self.api.factory.getPartConfig(condition);
                var equations = condition.children.equations && condition.children.equations.reverse() || [];
                var equationsArray = [];

                // There can be multiple equations per each condition.
                equations.forEach(function(equation) {

                    var equationConfig = self.api.factory.getPartConfig(equation);
                    equationsArray.push({
                        property: equationConfig.getValue('conditional_property'),
                        operator: equationConfig.getValue('conditional_operator'),
                        value: equationConfig.getValue('conditional_value')
                    });
                });

                // Collect all the condition and their respected equations in an array.
                conditionsArray.push({
                    condition: conditionConfig.getValue('conditional_match'),
                    equations: equationsArray
                });
            });

            return conditionsArray;
        },

        testUserConditions: function() {
            var self = this;

            if (!self.conditionsArray) return;

            // Conditions
            for (var i = 0; i < self.conditionsArray.length; i++) {

                var condition = self.conditionsArray[i].condition;
                var equations = self.conditionsArray[i].equations;
                var equationResults = [];

                // test each equation per condition and record the results
                for (var n = 0; n < equations.length; n++) {

                    var property = equations[n].property;
                    var operator = equations[n].operator;
                    var value = equations[n].value;

                    equationResults.push(self.testEquation(property, operator, value));
                }

                var dispatchString = "";

                // Test if condition is met; create dispatch message
                switch (condition) {
                    case "one":

                        var metOnce = self.isConditionMetOnce(equationResults);

                        // i + 1 because client facing trigger event numbering starts at 1.
                        if (metOnce) {
                            dispatchString = "condition_" + (i + 1) + "_match";
                        } else {
                            dispatchString = "condition_" + (i + 1) + "_fail";
                        }

                        break;
                    case "all":

                        var metAll = self.isConditionMetAll(equationResults);

                        if (metAll) {
                            dispatchString = "condition_" + (i + 1) + "_match";
                        } else {
                            dispatchString = "condition_" + (i + 1) + "_fail";
                        }

                        break;
                }

                // Notify runtime of condition results
                self.dispatchTrigger(dispatchString);
            }
        },

        dispatchTrigger: function(triggerMsg) {
            var self = this;

            self.trigger({
                type: triggerMsg,
                trigger: self.metricsHelper
            });
        },

        // Test if at least one equation matches
        isConditionMetOnce: function(results) {
            var isMet = false;

            for (var i = 0; i < results.length; i++) {

                if (results[i] === true) {
                    isMet = true;
                }
            }

            return isMet;
        },

        // Test if all equations match
        isConditionMetAll: function(results) {
            var isMet = true;

            for (var i = 0; i < results.length; i++) {

                if (results[i] === false) {
                    isMet = false;
                    break;
                }
            }

            return isMet;
        },

        // Test user defined conditions
        testEquation: function(property, operator, value) {
            var self = this;

            // Returns the value of the property
            property = self.getKeyMatchValue(property);

            switch (operator) {

                case "===":

                    if (property === value) {
                        return true;
                    } else {
                        return false;
                    }

                    break;
                case "!=":

                    if (property != value) {
                        return true;
                    } else {
                        return false;
                    }

                    break;
            }
        },

        // Find key value of a query string match
        getKeyMatchValue: function(queryString) {
            var self = this;

            if (!self.keyValuesArray) return null;

            for (var i = 0; i < self.keyValuesArray.length; i++) {

                // Return result
                if (queryString === self.keyValuesArray[i].key) {
                    return self.keyValuesArray[i].value;
                }
            }

            // No matches if this line is reached
            return null;
        },

        createDefaultValuesArray: function() {
            var self = this;

            var defaultValues = self.containers.defaultValues && self.containers.defaultValues.reverse() || [];
            var tempArray = [];

            defaultValues.forEach(function(val) {

                // Get node configuration
                var defaultsConfig = self.api.factory.getPartConfig(val);

                // Collect all the key/value pairs
                tempArray.push({
                    key: defaultsConfig.getValue('default_key'),
                    value: defaultsConfig.getValue('default_value')
                });
            });

            return tempArray;
        },

		/************************************************************
         **
         **                       API
         **
         ************************************************************/
        requestAPIData: function() {
            var self = this;

            if (self.apiKey !== undefined) {

                // Load data
                self.xmlHttp = new XMLHttpRequest();
                self.xmlHttp.open('GET', self.apiUrl, true);
                self.xmlHttp.onload = function(e) {

                    if (this.readyState === 4 && this.status === 200) {

                        self.apiData = this.responseXML;
                        self.dataLoaded = true;

                        // Alert dependent component that data has loaeded
                        self.dispatchTrigger("asset_load_complete");

                        // Set desired display (raw data vs. formatted text)
                        if (self.config.getBoolean('show_data')) {
                            self.displayAPIResponse();
                        } else {
                            self.displayComponentText();
                        }

                        // Gather user conditions and examine them for matches
                        self.conditionsArray = self.createConditionsArray();

                        self.testUserConditions();

                    } else {

                        self.dispatchTrigger("asset_load_error");
                    }
                };

                self.xmlHttp.send(null);
            }
        },

        testAPIData: function() {
            var self = this;

            self.apiData = self.convertStringToXMLObject(self.testData);
            self.dataLoaded = true;

            // Set desired display (raw data vs. formatted text)
            if (self.config.getBoolean('show_data')) {
                self.displayAPIResponse();
            } else {
                self.displayComponentText();
            }

            // Gather user conditions and examine them for matches
            self.conditionsArray = self.createConditionsArray();

            self.testUserConditions();

        },

        convertStringToXMLObject: function(xmlString) {
            var parser = new DOMParser();
            var fragment = parser.parseFromString(xmlString, "text/xml");

            return fragment;
        },

        // Creates a scrollable container to display API results
        displayAPIResponse: function() {
            var self = this;

            self.debugContainer = self.api.dom.getElement("div");
            self.addChild(self.debugContainer);

            self.debugText = self.api.dom.getElement("div");
            self.debugText.x(0);
            self.debugText.y(0);
            self.debugText.width(self.rectangle.width);
            self.debugContainer.addChild(self.debugText);

            self.debugContainer.x(0);
            self.debugContainer.y(0);
            self.debugContainer.width(self.rectangle.width);
            self.debugContainer.height(self.rectangle.height);

            self.debugText.css({
                'font-family': 'Arial, Helvetica, sans-serif',
                'font-size': '12px',
                'user-select': 'text'
            });

            self.debugText.html(self.XMLToNodeDetail(self.apiData));

            self.debugContainer = self.api.dom.makeScrollable(self.debugContainer);
        },

        // Returns an HTML string detailing the key/value pairs from the given XML
        XMLToNodeDetail: function(oXML) {
            var self = this;
            var childrens = oXML.getElementsByTagName('result')[0].childNodes;
            var outputText = "";

            // Use proper headline
            if (self.config.getBoolean('load_ip_data')) {
                outputText = "<b><u>API result</u> :</b> <br/><br>";
            } else {
                outputText = "<b><u>Test Data</u> :</b> <br/><br>";
            }

            // Reset
            self.keyValuesArray = [];

            for (var i = 0; i < childrens.length; i++) {

                // Only deal with node type 1 (element node)
                if (childrens[i].nodeType === 1) {
                    outputText += "<b>" + childrens[i].nodeName + "</b> : " + childrens[i].textContent + "<br>";
                    // Populate key/value pairs Array
                    var tc = childrens[i].innerHTML || childrens[i].textContent;
                    self.populateKeyValueArray(childrens[i].nodeName, tc);
                    // Consider children with children
                    var subChildren = childrens[i].childNodes;
                    var builtName = "";
                    if (subChildren[1] && subChildren[1].nodeType === 1) {
                        for (var n=0; n < subChildren.length; n++){
                            if (subChildren[n].nodeType === 1) {
                                builtName = childrens[i].nodeName + "::" + subChildren[n].nodeName;
                                outputText += "<b>" + builtName + "</b> : " + subChildren[n].textContent + "<br>";
                                tc = subChildren[n].innerHTML || subChildren[n].textContent;
                                self.populateKeyValueArray(builtName, tc);
                            }
                        }
                    }
                }
            }

            return outputText;
        },

        // Simplify XML
        populateKeyValueArray: function(key, value) {
            var self = this;

            if (self.keyValuesArray) {

                self.keyValuesArray.push({
                    'key': key,
                    'value': value
                });
            }
        },

        /************************************************************
         ** Users can create dynamic text using keyword identifiers,
         ** such as @@keyword-name@@, to let the component know to
         ** replace it with the coordinating value from the API
         ** result.
         ***********************************************************/
        replaceKeywords: function() {
            var self = this;
            var oldWords = self.orginComponentText;

            // Replaces keywords with their respected values
            for (var i = 0; i < self.keyValuesArray.length; i++) {

                var keyword = "@@" + self.keyValuesArray[i].key + "@@";

                // Get every instance
                while (oldWords.indexOf(keyword) != -1) {
                    oldWords = oldWords.replace(keyword, self.keyValuesArray[i].value);
                }
            }

            // If keyword value doesn't exist in XML, replace with a user defined alternative/default value
            for (var n = 0; n < self.defaultValuesArray.length; n++) {

                var defaultKeyword = "@@" + self.defaultValuesArray[n].key + "@@";

                // Get every instance
                while (oldWords.indexOf(defaultKeyword) != -1) {
                    oldWords = oldWords.replace(defaultKeyword, self.defaultValuesArray[n].value);
                }
            }

            self.componentText = oldWords;
        },

        displayComponentText: function() {
            var self = this;

            if (self.pauseDataDelivery && self.dataLoaded && self.mode === "MASTER_MODE") {

                // Send data to slave
                self.api.messenger.send("API_MASTER_DATA_SENT", {
                    data: self.apiData
                }, null);

                self.pauseDataDelivery = false;
            }

            self.XMLToNodeDetail(self.apiData); // just for valueArray creation
            self.defaultValuesArray = self.createDefaultValuesArray();
            self.replaceKeywords();
            self.render();
            self.addScrolling();
        },

        render: function() {
            var self = this;

            var txt = self.componentText || "";
            txt = txt.replace(/<!--[\s\S]*?-->/g, "");

            var fragment;
			
            try {
                fragment = new DocumentFragment();
            } catch (e) {
                fragment = self.dom.ownerDocument.createDocumentFragment();
            }
            var inner = self.api.dom.getElement('div');
            fragment.appendChild(inner.dom);
            inner.dom.innerHTML = txt;

            var i;
            var imgTags = inner.dom.getElementsByTagName("img");
            for (i = 0; i < imgTags.length; i++) {
                imgTags[i].setAttribute("src", self.api.urls.getProxiedImageUrl(imgTags[i].getAttribute("src"), {
                    maxWidth: imgTags[i].width ? imgTags[i].width : "",
                    maxHeight: imgTags[i].height ? imgTags[i].height : "",
                    type: "FILL"
                }));
            }

            for (i = 0; i < self.invalidTags.length; i++) {
                var tags = inner.dom.getElementsByTagName(self.invalidTags[i]);
                for (var j = 0; j < tags.length; j++) {
                    tags[j].parentNode.removeChild(tags[j]);
                }
            }

            var htmlContent = inner.dom.innerHTML;

            if (htmlContent.indexOf("<parsererror") > -1) {
                htmlContent = "<strong>Unable to render the current layer.</strong> It may contain malformed markup.";
            }

            self.text.html(htmlContent);

            var aTags = self.text.dom.getElementsByTagName("a");
            var clickFunc = function(e) {
                var a = e.currentTarget;
                var href = a.getAttribute("data-href");
                var target = "_blank";

                var eventData = {
                    url: href,
                    target: target
                };

                self.metricsHelper = self.metricsHelper.logInteraction({
                    subtype: self.api.metrics.subtype.INTERACTION_SELECT,
                    mode: self.api.metrics.mode.TOUCH,
                    detail: self.label,
                    eventData: eventData
                });

                // If it's a "tel" link, record a custom metric (api.net.open uses 
				// factory.getClickthroughUrl which does not 'metrics-wrap' "tel" or "sms" links).
                if (href.match(/^tel\:/i)) {
                    self.metricsHelper = self.metricsHelper.logContent({
                        subtype: self.api.metrics.subtype.CONTENT_CALL_PHONE,
                        detail: href.substring(href.indexOf("tel:") + 4)
                    });
                }

                self.api.net.open(href, target, self.metricsHelper);
            };

            for (i = 0; i < aTags.length; i++) {
                var anchor = aTags[i];
                anchor.setAttribute('data-href', anchor.getAttribute('href'));
                anchor.setAttribute('href', ['javascript', ':', 'void(0)'].join(''));
                anchor.removeAttribute('target');
                aTags[i].addEventListener("click", clickFunc);
            }

            if (self.config.getBoolean("make_selectable")) {
                self.text.css("user-select", "text");
            }

            self.text.css('text-align', self.config.getValue("position"));

            var bodyStyle = "normal";
            var bodyFamily = self.config.getValue("body_font");
            var bodyFontUrl = self.getFontUrl(self.config.getValue("body_font_type"), self.config.getValue("body_web_font"), self.config.getValue("body_web_font_custom"));
            if (bodyFontUrl) {
                self.addFont(bodyFontUrl);
                bodyFamily = self.getFontFamily(bodyFontUrl, self.config.getValue("body_web_font_fallback"));
                bodyStyle = (bodyFontUrl.lastIndexOf("italic") === bodyFontUrl.length - 6) ? "italic" : bodyStyle;
            }
            var letterSpacing = self.config.getValue("body_letter_spacing");
            letterSpacing += (letterSpacing !== "normal" && letterSpacing !== "auto") ? "px" : "";

            var cssContent = ["#", self.text.id, " {\n",
                "font-family: ", bodyFamily, ";\n",
                "font-style: ", bodyStyle, ";\n",
                "font-size: ", self.config.getValue("body_font_size"), "px;\n",
                "color: ", self.config.getColor("body_text_color"), ";\n",
                "line-height: ", self.config.getValue("body_line_height"), ";\n",
                'letter-spacing: ', letterSpacing, ";\n",
                "\n}"
            ].join(['']);

            if (self.config.getBoolean("body_shadow")) {
                cssContent = cssContent + ["#", self.text.id, "{\n",
                    "text-shadow: ",
                    self.config.getInt("body_h_shadow"), "px ",
                    self.config.getInt("body_v_shadow"), "px ",
                    self.config.getInt("body_shadow_blur"), "px ",
                    "rgba(", self.api.util.hexToRgba(self.config.getColor("body_shadow_color"), self.config.getInt("body_shadow_alpha") / 100), ");\n",
                    "\n}"
                ].join(['']);
            }

            var hdrStyle = "normal";
            var hdrFamily = self.config.getValue("headers_font");
            var hdrFontUrl = self.getFontUrl(self.config.getValue("headers_font_type"), self.config.getValue("headers_web_font"), self.config.getValue("headers_web_font_custom"));
            if (hdrFontUrl) {
                self.addFont(hdrFontUrl);
                hdrFamily = self.getFontFamily(hdrFontUrl, self.config.getValue("headers_web_font_fallback"));
                hdrStyle = (hdrFontUrl.lastIndexOf("italic") === hdrFontUrl.length - 6) ? "italic" : hdrStyle;
            }
            var hdrLetterSpacing = self.config.getValue("headers_letter_spacing");
            hdrLetterSpacing += (hdrLetterSpacing !== "normal" && hdrLetterSpacing !== "auto") ? "px" : "";
            for (i = 1; i <= 6; i++) {
                var fontSize = (self.config.getValue("headers_font_size") / (2 * i)) + Number(self.config.getValue("headers_font_size"));
                cssContent = cssContent + ["#", self.text.id, " h" + i, " {\n",
                    "font-family: ", hdrFamily, ";\n",
                    "font-style: ", hdrStyle, ";\n",
                    "font-size: ", fontSize, "px;\n",
                    "color: ", self.config.getColor("headers_text_color"), ";\n",
                    "line-height: ", self.config.getValue("headers_line_height"), ";\n",
                    'letter-spacing: ', hdrLetterSpacing, ";\n",
                    "\n}"
                ].join(['']);


                if (self.config.getBoolean("headers_shadow")) {
                    cssContent = cssContent + ["#", self.text.id, " h" + i, " {\n",
                        "text-shadow: ",
                        self.config.getInt("headers_h_shadow"), "px ",
                        self.config.getInt("headers_v_shadow"), "px ",
                        self.config.getInt("headers_shadow_blur"), "px ",
                        "rgba(", self.api.util.hexToRgba(self.config.getColor("headers_shadow_color"), self.config.getInt("headers_shadow_alpha") / 100), ");\n",
                        "\n}"
                    ].join(['']);
                } else {
                    cssContent = cssContent + ["#", self.text.id, " h" + i, " {\n",
                        "text-shadow: none", ";\n",
                        "\n}"
                    ].join(['']);
                }
            }

            cssContent = cssContent + ["#", self.text.id, " b,", "#", self.text.id, " strong", " {\n",
                "color: ", self.config.getColor("bold_color"), ";\n",
                "\n}"
            ].join(['']);

            cssContent = cssContent + ["#", self.text.id, " i,", "#", self.text.id, " em", " {\n",
                "color: ", self.config.getColor("italic_color"), ";\n",
                "\n}"
            ].join(['']);

            cssContent = cssContent + ["#", self.text.id, " a", " {\n",
                "color: ", self.config.getColor("link_color"), ";\n",
                "text-decoration: ", (self.config.getBoolean("link_underline") ? "underline" : "none"), ";\n",
                "\n}"
            ].join(['']);

            cssContent = cssContent + ["#", self.text.id, " hr", " {\n",
                "border: 0; height: 1px;",
                "background-color: ", self.config.getColor("horizontal_rule_color"), ";\n",
                "letter-spacing: ", self.config.getValue("headers_letter_spacing"), ";\n",
                "\n}"
            ].join(['']);

            self.styleSheet.text(cssContent);
        },

        getFontUrl: function(type, webFontUrl, customFontUrl) {
            var fontUrl;

            if (type == "web") {
                fontUrl = webFontUrl;
                if (fontUrl == "custom" && customFontUrl) {
                    fontUrl = customFontUrl;
                    fontUrl = (fontUrl.indexOf('http://') === 0 || fontUrl.indexOf('https://') === 0 || fontUrl.indexOf('//') === 0) ? fontUrl.substring(fontUrl.indexOf('//') + 2) : fontUrl;
                }
            }
            return fontUrl;
        },

        getFontFamily: function(fontUrl, fallback) {
            var self = this;
            var family;

            var fontUrlNoDotJS = (fontUrl.lastIndexOf(".js") == fontUrl.length - 3) ? fontUrl.substring(0, fontUrl.length - 3) : fontUrl;
            for (var i = 0; i < self.webFontConfigs.length; i++) {
                if (fontUrlNoDotJS.indexOf(self.webFontConfigs[i].url) > -1) {
                    var suffixIndex = fontUrlNoDotJS.lastIndexOf(":");
                    family = fontUrlNoDotJS.substring(fontUrlNoDotJS.indexOf(self.webFontConfigs[i].url) + self.webFontConfigs[i].url.length, (suffixIndex === -1 || suffixIndex === 4 || suffixIndex === 5) ? fontUrlNoDotJS.length : suffixIndex);
                    family = family.split(self.webFontConfigs[i].urlDelim);
                    family = family.join(self.webFontConfigs[i].cssDelim);
                    break;
                }
            }
            family = (family) ? "'" + family + "', " + fallback : fallback;
            return family;
        },

        addFont: function(fontUrl) {
            var self = this;
			
            for (var i = 0; i < self.webFontConfigs.length; i++) {
                if (fontUrl.indexOf(self.webFontConfigs[i].url) > -1) {
                    var proxiedFontUrl = self.api.urls.getProxiedFeedUrl(fontUrl, {
                        raw: true
                    });
                    if (self.webFontConfigs[i].type == "link") {
                        var fontDom = self.api.dom.getElement("link");
                        fontDom.setAttribute({
                            href: proxiedFontUrl,
                            rel: 'stylesheet',
                            type: 'text/css'
                        });
                        self.addChild(fontDom);
                    } else if (self.webFontConfigs[i].type == "script") {
                        self.api.script.loadScript(proxiedFontUrl);
                    }
                    break;
                }
            }
        },

        addScrolling: function() {
            if (this.config.getBoolean("make_scrollable")) {

                var self = this;

                this.api.animation.requestAnimationFrame(function() {
                    var scroller = self.api.dom.makeScrollable(self.textContainer);
                    var scrollStartY = 0;
                    scroller.bind(self.api.dom.events.SCROLL_START, self.api.util.delegate(self, function(evt) {
                        scrollStartY = evt.info.y;
                    }));
                    scroller.bind(self.api.dom.events.SCROLL_END, function(evt) {
                        if (scrollStartY != evt.info.y) {
                            self.metricsHelper.logInteraction({
                                subtype: self.api.metrics.subtype.INTERACTION_SCROLL,
                                mode: self.api.metrics.mode.DRAG,
                                detail: "Text",
                                eventData: {
                                    from: scrollStartY,
                                    to: evt.info.y
                                }
                            });
                        }
                    });
                });
            }
        }
    });
})();