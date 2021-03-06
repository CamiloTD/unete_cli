var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const yamljs_1 = require("yamljs");
const path_1 = __importStar(require("path"));
const termx_1 = require("termx");
const https_1 = __importDefault(require("https"));
const fs_1 = __importDefault(require("fs"));
const ServerRender = __importStar(require("./render/serve"));
const Server = require('unete-io/server');
exports.ServerState = {};
/*
 
    ____                                          _
   / ___|___  _ __ ___  _ __ ___   __ _ _ __   __| |___
  | |   / _ \| '_ ` _ \| '_ ` _ \ / _` | '_ \ / _` / __|
  | |__| (_) | | | | | | | | | | | (_| | | | | (_| \__ \
   \____\___/|_| |_| |_|_| |_| |_|\__,_|_| |_|\__,_|___/
                                                        
 
*/
function serve(cmd, configFile) {
    return __awaiter(this, void 0, void 0, function* () {
        { //? @note (Serve) Init
            { //? @note (Serve.Init) Define Variables
                var config = getConfig(configFile);
                var stats = {
                    methodStats: {},
                    connected: {},
                    connectedSockets: new Map()
                };
                var methodTiming = {};
                var module;
                termx_1.log("Initializing server...");
            }
            { //? @note (Serve.Init) Setup env
                for (let i in config.env)
                    process.env[i] = config.env[i];
            }
        }
        { //? @note (Serve) Import module
            module = require(config.main);
            if (module.default && Object.keys(module).length > 1)
                delete module.default;
        }
        { //? @note (Serve) Config Https Server
            var https_server;
            if (config.https) {
                https_server = https_1.default.createServer({
                    key: fs_1.default.readFileSync(path_1.default.resolve(process.cwd(), config.https.key)),
                    cert: fs_1.default.readFileSync(path_1.default.resolve(process.cwd(), config.https.cert)),
                    ca: fs_1.default.readFileSync(path_1.default.resolve(process.cwd(), config.https.ca))
                });
            }
        }
        { //? Listen
            var getMethodStat = (method) => { var _a; return (_a = stats.methodStats[method]) !== null && _a !== void 0 ? _a : (stats.methodStats[method] = ({
                errors: 0,
                success: 0,
                total: 0,
                pending: 0,
                totalTime: 0,
                lastError: "",
                lastErrorStack: ""
            })); };
            var server = exports.ServerState.server = new Server(Object.assign(Object.assign({}, module), { $before_call({ path, iid }) {
                    var methodName = path.join('.');
                    var methodStats = getMethodStat(methodName);
                    methodStats.pending++;
                    methodStats.total++;
                    methodTiming[iid] = Date.now();
                    ServerRender.updateComponents("methods");
                    module.$before_call && module.$before_call(arguments[0]);
                },
                $after_call({ path, iid }) {
                    var methodName = path.join('.');
                    var methodStats = getMethodStat(methodName);
                    methodStats.pending--;
                    methodStats.success++;
                    if (methodTiming[iid]) {
                        methodStats.totalTime += Date.now() - methodTiming[iid];
                        delete methodTiming[iid];
                    }
                    ServerRender.updateComponents("methods");
                    module.$after_call && module.$after_call(arguments[0]);
                },
                $after_error({ path, iid, error }) {
                    var _a;
                    var methodName = path.join('.');
                    var methodStats = getMethodStat(methodName);
                    methodStats.pending--;
                    methodStats.errors++;
                    methodStats.lastError = error.message || JSON.stringify(error);
                    methodStats.lastErrorStack = (_a = error.stack) !== null && _a !== void 0 ? _a : "";
                    delete methodTiming[iid];
                    ServerRender.updateComponents("methods", 'stack');
                    module.$after_error && module.$after_error(arguments[0]);
                } }), https_server);
            if (config.https) {
                yield https_server.listen(config.port);
            }
            else {
                yield server.listen(config.port);
            }
        }
        { //? @note (Serve) On Server Connection
            server.on('connection', (sock) => {
                ServerRender.logConnection(sock);
            });
        }
        { //? @note (Serve) Render
            ServerRender.initRender({ config, server, module, stats });
        }
    });
}
exports.serve = serve;
/*
 
   _   _ _   _ _
  | | | | |_(_) |___
  | | | | __| | / __|
  | |_| | |_| | \__ \
   \___/ \__|_|_|___/
                     
 
*/
function getConfig(configFile = path_1.resolve(process.cwd(), "./unete.yml")) {
    var _a, _b, _c, _d;
    var config = {};
    try {
        config = yamljs_1.load(configFile);
    }
    catch (exc) { }
    const entryPoint = config.main || "index.js";
    { //? @note (GetConfig) Configure env
        var env = config.env || {};
        var currentEnv = ((_a = process.env.ENV) === null || _a === void 0 ? void 0 : _a.toLowerCase()) || "default";
        if (!env.default)
            env.default = {};
        env = Object.assign(Object.assign({}, env.default), (env[currentEnv] || {}));
    }
    return {
        main: path_1.join(process.cwd(), entryPoint),
        name: config.name || "Unete-IO",
        host: (_b = config.host) !== null && _b !== void 0 ? _b : "127.0.0.1",
        port: (_c = config.port) !== null && _c !== void 0 ? _c : 8080,
        logo: config.logo && path_1.resolve(process.cwd(), config.logo),
        https: config.https,
        log: path_1.resolve(process.cwd(), (_d = config.log) !== null && _d !== void 0 ? _d : "./unete.log"),
        log_persist: !!config.log_persist,
        env
    };
}
exports.getConfig = getConfig;
