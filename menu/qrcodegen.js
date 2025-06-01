"use strict";
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
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
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
Object.defineProperty(exports, "__esModule", { value: true });
var qrcode_1 = require("qrcode");
var pg_1 = require("pg");
var fs_1 = require("fs");
var path_1 = require("path");
// Database connection configuration for nextappdb
var pool = new pg_1.Pool({
    user: 'Sorin',
    database: 'nextappdb',
    password: '', // Replace with actual password
    host: 'localhost',
    port: 5432,
});
// Function to generate QR codes for all orders
function generateQRCodesForOrders() {
    return __awaiter(this, void 0, void 0, function () {
        var query, rows, _i, rows_1, row, order_id, table_number, memo, hive_uri, folderName, folderPath, _a, fileName, filePath, _b, error_1, error_2;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _c.trys.push([0, 17, 18, 20]);
                    query = "\n      SELECT order_id, table_number, memo, hive_uri\n      FROM orders\n      ORDER BY order_id\n    ";
                    return [4 /*yield*/, pool.query(query)];
                case 1:
                    rows = (_c.sent()).rows;
                    if (rows.length === 0) {
                        console.log('No orders found in the database.');
                        return [2 /*return*/];
                    }
                    _i = 0, rows_1 = rows;
                    _c.label = 2;
                case 2:
                    if (!(_i < rows_1.length)) return [3 /*break*/, 16];
                    row = rows_1[_i];
                    order_id = row.order_id, table_number = row.table_number, memo = row.memo, hive_uri = row.hive_uri;
                    folderName = "TABLE_".concat(table_number.replace('TABLE ', ''));
                    folderPath = path_1.default.join(process.cwd(), folderName);
                    _c.label = 3;
                case 3:
                    _c.trys.push([3, 5, , 7]);
                    return [4 /*yield*/, fs_1.promises.access(folderPath)];
                case 4:
                    _c.sent();
                    return [3 /*break*/, 7];
                case 5:
                    _a = _c.sent();
                    console.log("Creating folder: ".concat(folderPath));
                    return [4 /*yield*/, fs_1.promises.mkdir(folderPath, { recursive: true })];
                case 6:
                    _c.sent();
                    return [3 /*break*/, 7];
                case 7:
                    fileName = "".concat(memo, ".png");
                    filePath = path_1.default.join(folderPath, fileName);
                    _c.label = 8;
                case 8:
                    _c.trys.push([8, 14, , 15]);
                    _c.label = 9;
                case 9:
                    _c.trys.push([9, 11, , 12]);
                    return [4 /*yield*/, fs_1.promises.access(filePath)];
                case 10:
                    _c.sent();
                    console.log("Overwriting existing QR code: ".concat(filePath));
                    return [3 /*break*/, 12];
                case 11:
                    _b = _c.sent();
                    console.log("Generating new QR code: ".concat(filePath));
                    return [3 /*break*/, 12];
                case 12: return [4 /*yield*/, qrcode_1.default.toFile(filePath, hive_uri, {
                        width: 270, // Set QR code size to 270x270 pixels
                        margin: 1, // Standard margin for readability
                        color: {
                            dark: '#000000', // Black QR code
                            light: '#FFFFFF', // White background
                        },
                    })];
                case 13:
                    _c.sent();
                    console.log("QR code generated for order ".concat(order_id, ": ").concat(filePath));
                    return [3 /*break*/, 15];
                case 14:
                    error_1 = _c.sent();
                    console.error("Failed to generate QR code for order ".concat(order_id, ":"), error_1);
                    return [3 /*break*/, 15];
                case 15:
                    _i++;
                    return [3 /*break*/, 2];
                case 16:
                    console.log('All QR codes generated successfully.');
                    return [3 /*break*/, 20];
                case 17:
                    error_2 = _c.sent();
                    console.error('Error querying orders or generating QR codes:', error_2);
                    return [3 /*break*/, 20];
                case 18: return [4 /*yield*/, pool.end()];
                case 19:
                    _c.sent();
                    return [7 /*endfinally*/];
                case 20: return [2 /*return*/];
            }
        });
    });
}
// Run the script
generateQRCodesForOrders();
