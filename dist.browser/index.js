var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
import { useState, useEffect } from "react";
//////////////////////////////////////////
// GLOBALS
//////////////////////////////////////////
var COMPOSE_USER_CACHE_KEY = "compose-cache:user";
var COMPOSE_TOKEN_KEY = "compose-token";
var subscriptions = {};
var loggedInUser = null;
if (localStorage.getItem(COMPOSE_USER_CACHE_KEY)) {
    loggedInUser = safeParseJSON(localStorage.getItem(COMPOSE_USER_CACHE_KEY));
}
var loggedInUserSubscriptions = new Set();
var ensureSet = function (name) {
    return (subscriptions[name] = subscriptions[name] || new Set());
};
var callbacks = {};
var getCallbacks = function (name) {
    return callbacks[name] || [function () { return void 0; }, function () { return void 0; }];
};
var socketOpen = false;
var queuedMessages = [];
var socket;
var composeServerUrl = "ws://api.compose.run";
//////////////////////////////////////////
// UTILS
//////////////////////////////////////////
function safeParseJSON(str) {
    if (!str) {
        return null;
    }
    try {
        return JSON.parse(str);
    }
    catch (e) {
        return null;
    }
}
function send(data) {
    var requestId = (Math.random() + 1).toString(36).substring(7);
    return new Promise(function (resolve, reject) {
        callbacks[requestId] = [resolve, reject];
        if (socketOpen) {
            actuallySend(__assign(__assign({}, data), { requestId: requestId }));
        }
        else {
            // TODO - after a while, close and try to reconnect
            // TODO - eventually, throw an error (promise throw)
            //        on all the places that pushed to this queue
            queuedMessages.push(__assign(__assign({}, data), { requestId: requestId }));
        }
    });
}
function actuallySend(data) {
    try {
        socket.send(JSON.stringify(data));
        queuedMessages = queuedMessages.filter(function (d) { return d.requestId !== data.requestId; });
    }
    catch (e) {
        console.error(e);
    }
}
function updateValue(name, value) {
    ensureSet(name).forEach(function (callback) { return callback(value); });
    // TODO - cache value in localstorage
}
// https://blog.trannhat.xyz/generate-a-hash-from-string-in-javascript/
var hashCode = function (s) {
    return s.split("").reduce(function (a, b) {
        a = (a << 5) - a + b.charCodeAt(0);
        return a & a;
    }, 0);
};
//////////////////////////////////////////
// SETUP
//////////////////////////////////////////
// On page load, check if the URL contains the `magicLinkToken` param
var magicLinkToken = new URLSearchParams(window.location.search).get("composeToken");
if (magicLinkToken) {
    send({
        type: "LoginRequest",
        token: magicLinkToken,
    });
}
//////////////////////////////////////////
// HANDLE SERVER RESPONSES
//////////////////////////////////////////
var handleServerResponse = function (event) {
    var data = safeParseJSON(event.data);
    if (!data) {
        console.error("Invalid JSON received from server");
        console.error(event);
        return;
    }
    if (data.type === "SubscribeResponse" ||
        data.type === "UpdatedValueResponse") {
        if (data.type === "UpdatedValueResponse" && data.error) {
            getCallbacks(data.requestId)[1]("".concat(data.name, ": Cannot set this state because there is a reducer with the same name"));
        }
        else {
            getCallbacks(data.requestId)[0](data.value);
            updateValue(data.name, data.value);
        }
    }
    else if (data.type === "LoginResponse") {
        if (data.token) {
            localStorage.setItem(COMPOSE_TOKEN_KEY, data.token);
            localStorage.setItem(COMPOSE_USER_CACHE_KEY, JSON.stringify(data.user));
            loggedInUser = data.user || null;
            getCallbacks(data.requestId)[0](data.user);
            loggedInUserSubscriptions.forEach(function (callback) {
                return callback(data.user);
            });
        }
        else if (data.error) {
            getCallbacks(data.requestId)[1](data.error);
        }
        else {
            // token already saved in localStorage, so just call the callback
            loggedInUser = data.user || null;
            getCallbacks(data.requestId)[0](data.user);
        }
    }
    else if (data.type === "ParseErrorResponse") {
        console.error("Sent invalid JSON to server");
        console.error(data.cause);
    }
    else if (data.type === "ResolveDispatchResponse") {
        getCallbacks(data.requestId)[0](data.resolveValue);
        updateValue(data.name, data.returnValue);
    }
    else if (data.type === "RuntimeDebugResponse") {
        data.consoles.forEach(function (log) { return console.log("".concat(data.name, ": ").concat(log)); });
        if (data.error) {
            console.error("".concat(data.name, "\n\n").concat(data.error.stack));
        }
    }
    else {
        console.warn("Unknown response type from Compose server: ".concat(data.type));
    }
};
//////////////////////////////////////////
// Setup Websocket
//////////////////////////////////////////
var handleSocketOpen = function () { return __awaiter(void 0, void 0, void 0, function () {
    var _i, queuedMessages_1, message;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                socketOpen = true;
                if (localStorage.getItem(COMPOSE_TOKEN_KEY)) {
                    send({
                        type: "LoginRequest",
                        token: localStorage.getItem(COMPOSE_TOKEN_KEY),
                    });
                }
                _i = 0, queuedMessages_1 = queuedMessages;
                _a.label = 1;
            case 1:
                if (!(_i < queuedMessages_1.length)) return [3 /*break*/, 4];
                message = queuedMessages_1[_i];
                return [4 /*yield*/, actuallySend(message)];
            case 2:
                _a.sent();
                _a.label = 3;
            case 3:
                _i++;
                return [3 /*break*/, 1];
            case 4: return [2 /*return*/];
        }
    });
}); };
var handleSocketClose = function () {
    socketOpen = false;
    setTimeout(setupWebsocket, 200);
};
function setupWebsocket() {
    if (socket)
        socket.close();
    try {
        socket = new WebSocket(composeServerUrl);
        socket.addEventListener("message", handleServerResponse);
        socket.addEventListener("open", handleSocketOpen);
        socket.addEventListener("close", handleSocketClose);
    }
    catch (e) {
        console.error(e);
    }
}
setupWebsocket();
export function setComposeServerUrl(url) {
    composeServerUrl = url;
    setupWebsocket();
}
//////////////////////////////////////////
// Common: Cloud State & Reducer
//////////////////////////////////////////
function useSubscription(name, setState) {
    useEffect(function () {
        if (!ensureSet(name).size) {
            send({
                type: "SubscribeRequest",
                name: name,
            });
        }
        subscriptions[name].add(setState);
        return function () {
            subscriptions[name].delete(setState);
            if (!ensureSet(name).size) {
                send({
                    type: "UnsubscribeRequest",
                    name: name,
                });
            }
        };
    }, [setState]);
}
//////////////////////////////////////////
// Cloud State
//////////////////////////////////////////
export function setCloudState(name, value) {
    send({
        type: "StateUpdateRequest",
        name: name,
        value: value,
    });
}
export function useCloudState(name, initialState) {
    var _a = useState(initialState), state = _a[0], setState = _a[1];
    useSubscription(name, setState);
    return [state, function (s) { return setCloudState(name, s); }];
}
//////////////////////////////////////////
// CLOUD REDUCER
//////////////////////////////////////////
export function dispatchCloudReducerEvent(name, event) {
    send({
        type: "ReducerEventRequest",
        name: name,
        value: event,
    });
}
export function useCloudReducer(_a) {
    var name = _a.name, initialState = _a.initialState, reducer = _a.reducer;
    var _b = useState(initialState), state = _b[0], setState = _b[1];
    useSubscription(name, setState);
    useEffect(function () {
        send({
            type: "RegisterReducerRequest",
            name: name,
            reducerCode: reducer.toString(),
            initialState: initialState,
        });
    }, [name, reducer.toString(), JSON.stringify(initialState)]);
    return [state, function (s) { return dispatchCloudReducerEvent(name, s); }];
}
//////////////////////////////////////////
// USER & AUTH
//////////////////////////////////////////
export function magicLinkLogin(_a) {
    var email = _a.email, appName = _a.appName, redirectURL = _a.redirectURL;
    redirectURL = redirectURL || window.location.href;
    return send({
        type: "SendMagicLinkRequest",
        email: email,
        appName: appName,
        redirectURL: redirectURL,
    });
}
export function useUser() {
    var _a = useState(loggedInUser), user = _a[0], setUser = _a[1];
    useEffect(function () {
        loggedInUserSubscriptions.add(setUser);
        return function () {
            loggedInUserSubscriptions.delete(setUser);
        };
    }, []);
    return user;
}
export function logout() {
    localStorage.removeItem(COMPOSE_TOKEN_KEY);
    localStorage.removeItem(COMPOSE_USER_CACHE_KEY);
    socket.send(JSON.stringify({ type: "LogoutRequest" }));
}
