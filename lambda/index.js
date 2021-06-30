/* *
 * This sample demonstrates handling intents from an Alexa skill using the Alexa Skills Kit SDK (v2).
 * Please visit https://alexa.design/cookbook for additional examples on implementing slots, dialog management,
 * session persistence, api calls, and more.
 * */
const Alexa = require('ask-sdk-core'); 
const axios = require('axios');
const groceries = require('./groceries');

const getRemoteData = (url) => new Promise((resolve, reject) => {  
  const client = url.startsWith('https') ? require('https') : require('http');  
  const request = client.get(url, (response) => {  
    if (response.statusCode < 200 || response.statusCode > 299) {  
      reject(new Error(`Failed with status code: ${response.statusCode}`));  
    }  
    const body = [];  
    response.on('data', (chunk) => body.push(chunk));  
    response.on('end', () => resolve(body.join('')));  
  });  
  request.on('error', (err) => reject(err));  
}); 


const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
    },
    handle(handlerInput) {
        const speakOutput = 'Willkommen zum CO2-Berater für Ihren Einkauf. Wie kann ich Ihnen helfen?';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

const HelloWorldIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'HelloWorldIntent';
    },
    handle(handlerInput) {
        const speakOutput = 'Hallo Welt! Ich bin ein CO zwei Berater von Helena und Fabian!';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            //.reprompt('add a reprompt if you want to keep the session open for the user to respond')
            .getResponse();
    }
};

const GroceriesAddIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'GroceriesAddIntent';
    },
    async handle(handlerInput) {     
        let groceryName;
        const grocerySlot = handlerInput.requestEnvelope.request.intent.slots.Grocery;
        if (grocerySlot && grocerySlot.value) {
          groceryName = grocerySlot.value.toLowerCase();
        }
        
        const countrySlot = handlerInput.requestEnvelope.request.intent.slots.Country;
        let countryName;
        if (countrySlot && countrySlot.value) {
          countryName = countrySlot.value.toLowerCase();
        } 
        
        const deviceId = handlerInput.requestEnvelope.context.System.device.deviceId;
        const consentToken = handlerInput.requestEnvelope.context.System.apiAccessToken;

        await axios.get(`https://api.eu.amazonalexa.com/v1/devices/${deviceId}/settings/address/countryAndPostalCode`, { 
          headers: {'Accept': 'application/json', 'Authorization': `Bearer ${consentToken}` }
        })
        .then((response) => {
          country = response.data.countryCode.toLowerCase();
        })
        .catch((error)=> {
            country = '';
        });
  
        let speakOutput = 'Leider konnte ich Ihre Anfrage nicht hinzufügen.';
        let grocery = getGrocery(country, groceryName, countryName);
        if(grocery != undefined) {
            shoppingList.push({"name": groceryName, "country": countryName, "value": grocery, "deleted": false });
            speakOutput = groceryName + ' aus ' + countryName + ' hinzugefügt.';
        }
        

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
}; 

const GroceriesRemoveIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'GroceriesRemoveIntent';
    },
    handle(handlerInput) {
        let groceryName;
        const grocerySlot = handlerInput.requestEnvelope.request.intent.slots.Grocery;
        if (grocerySlot && grocerySlot.value) {
          groceryName = grocerySlot.value.toLowerCase();
        }
        
        const countrySlot = handlerInput.requestEnvelope.request.intent.slots.Country;
        let countryName;
        if (countrySlot && countrySlot.value) {
          countryName = countrySlot.value.toLowerCase();
        } 
        
        shoppingList.forEach((item)=> {
            if(item.name == groceryName && item.country == countryName){
                item.deleted = true;
            }
        });
        
        const speakOutput = groceryName + ' aus ' + countryName + ' entfernt.';
        
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
}; 

const GroceriesSumIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'GroceriesSumIntent';
    },
    handle(handlerInput) {
        let currDate = new Date();
        let currentMonth = currDate.getMonth() + 1;
        let sum = 0;
        let speakOutput = "Ihr Einkauf besteht aus: "
        
        shoppingList.forEach((item)=> {
            if(item.deleted == false) {
                speakOutput = speakOutput + item.name + " aus " + item.country + ", ";
            
                if(item.value.SeasonFrom <= currentMonth && item.value.SeasonTo >= currentMonth) {
                    sum += item.value.InSeason;
                }
                else {
                    sum += item.value.OffSeason;
                }
            }
        });
     
        speakOutput = speakOutput + ". In Summe ergibt das einen errechneten CO Ausstoß von: " + sum + " Gramm. ";
        speakOutput = speakOutput + "Das entspricht in etwa einer Fahrtstrecke von " + Math.round(sum / 0.2) + " Meter mit einem PKW!"

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};     

let country = '';
let shoppingList = new Array();

const GroceriesIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'GroceriesLookupIntent';
    },
    async handle(handlerInput) {
        const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    
        const grocerySlot = handlerInput.requestEnvelope.request.intent.slots.Grocery;
        let groceryName;
        if (grocerySlot && grocerySlot.value) {
          groceryName = grocerySlot.value.toLowerCase();
        }
        
        const countrySlot = handlerInput.requestEnvelope.request.intent.slots.Country;
        let countryName;
        if (countrySlot && countrySlot.value) {
          countryName = countrySlot.value.toLowerCase();
        } 
  
        const deviceId = handlerInput.requestEnvelope.context.System.device.deviceId;
        const consentToken = handlerInput.requestEnvelope.context.System.apiAccessToken;

        await axios.get(`https://api.eu.amazonalexa.com/v1/devices/${deviceId}/settings/address/countryAndPostalCode`, { 
          headers: {'Accept': 'application/json', 'Authorization': `Bearer ${consentToken}` }
        })
        .then((response) => {
          country = response.data.countryCode.toLowerCase();
        })
        .catch((error)=> {
            country = '';
        });
        
        if(country == '') {
            return handlerInput.responseBuilder
                .withAskForPermissionsConsentCard(['read::alexa:device:all:address:country_and_postal_code'])
                .speak("Leider kann ich Ihre Position nicht ermitteln. Bitte gewähren Sie mir die nötigen Berechtigungen zur Lokalisation")
                .getResponse();
        }
  
        let currDate = new Date();
        let currentMonth = currDate.getMonth() + 1;
        let groceryObject = undefined;
  
        groceryObject = getGrocery(country, groceryName, countryName);
        let outputSpeech = '';
        
        if(groceryObject != undefined) {
            if(groceryObject.SeasonFrom <= currentMonth && groceryObject.SeasonTo >= currentMonth) {
                outputSpeech = groceryName + " aus " + countryName + " hat gerade Saison. Der CO zwei Ausstoß beträgt " + groceryObject.InSeason + " Gramm";
            }
            else {
                outputSpeech = groceryName + " aus " + countryName + " ist gerade nicht saisonal, daher beträgt der CO zwei Ausstoß " + groceryObject.OffSeason + " Gramm";
            }
        }
        else {
            outputSpeech =outputSpeech+ "Leider konnte ich keine CO2 Informationen für " + groceryName + " aus " + countryName + " finden."
        }
  
        return handlerInput.responseBuilder
            .speak(outputSpeech)
            .reprompt(outputSpeech)
            .getResponse();
    }
}

function getGrocery(country, groceryName, countryName) {
    let retVal = undefined;
   groceries.countries.forEach(function (object) {
        var key = Object.keys(object)[0];
        if(key.toLowerCase() == country) {
        	object[key].forEach(function(grocery) {
        	var groceryKey = Object.keys(grocery)[0];
            if(groceryKey.toLowerCase() == groceryName) {
            	grocery[groceryKey].forEach(function(destCountry) {
                  var destCountryKey = Object.keys(destCountry)[0];
                  if(destCountryKey.toLowerCase() == countryName) {
                    retVal =  destCountry[destCountryKey];
                  }
              });
            }
          });
        }
    });
    
    return retVal;
}

const HelpIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
        const speakOutput = 'Leider kann ich Ihnen nicht weiter helfen. Laufen Sie schreiend im Kreis.';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

const CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent'
                || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent');
    },
    handle(handlerInput) {
        const speakOutput = 'Goodbye!';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .getResponse();
    }
};
/* *
 * FallbackIntent triggers when a customer says something that doesn’t map to any intents in your skill
 * It must also be defined in the language model (if the locale supports it)
 * This handler can be safely added but will be ingnored in locales that do not support it yet 
 * */
const FallbackIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.FallbackIntent';
    },
    handle(handlerInput) {
        const speakOutput = 'Sorry, I don\'t know about that. Please try again.';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};
/* *
 * SessionEndedRequest notifies that a session was ended. This handler will be triggered when a currently open 
 * session is closed for one of the following reasons: 1) The user says "exit" or "quit". 2) The user does not 
 * respond or says something that does not match an intent defined in your voice model. 3) An error occurs 
 * */
const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        console.log(`~~~~ Session ended: ${JSON.stringify(handlerInput.requestEnvelope)}`);
        // Any cleanup logic goes here.
        return handlerInput.responseBuilder.getResponse(); // notice we send an empty response
    }
};
/* *
 * The intent reflector is used for interaction model testing and debugging.
 * It will simply repeat the intent the user said. You can create custom handlers for your intents 
 * by defining them above, then also adding them to the request handler chain below 
 * */
const IntentReflectorHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest';
    },
    handle(handlerInput) {
        const intentName = Alexa.getIntentName(handlerInput.requestEnvelope);
        const speakOutput = `You just triggered ${intentName}`;

        return handlerInput.responseBuilder
            .speak(speakOutput)
            //.reprompt('add a reprompt if you want to keep the session open for the user to respond')
            .getResponse();
    }
};
/**
 * Generic error handling to capture any syntax or routing errors. If you receive an error
 * stating the request handler chain is not found, you have not implemented a handler for
 * the intent being invoked or included it in the skill builder below 
 * */
const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        const speakOutput = 'Sorry, I had trouble doing what you asked. Please try again.';
        console.log(`~~~~ Error handled: ${JSON.stringify(error)}`);

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

/**
 * This handler acts as the entry point for your skill, routing all request and response
 * payloads to the handlers above. Make sure any new handlers or interceptors you've
 * defined are included below. The order matters - they're processed top to bottom 
 * */
exports.handler = Alexa.SkillBuilders.custom()
    .addRequestHandlers(
        LaunchRequestHandler,
        HelloWorldIntentHandler,
        GroceriesIntentHandler,
        GroceriesRemoveIntentHandler,
        GroceriesAddIntentHandler,
        GroceriesSumIntentHandler,
        HelpIntentHandler,
        CancelAndStopIntentHandler,
        FallbackIntentHandler,
        SessionEndedRequestHandler,
        IntentReflectorHandler)
    .addErrorHandlers(
        ErrorHandler)
    .withCustomUserAgent('sample/hello-world/v1.2')
    .lambda();
