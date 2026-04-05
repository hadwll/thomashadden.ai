"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
exports.id = "_rsc_lib_rag_vector-store_ts";
exports.ids = ["_rsc_lib_rag_vector-store_ts"];
exports.modules = {

/***/ "(rsc)/./lib/rag/vector-store.ts":
/*!*********************************!*\
  !*** ./lib/rag/vector-store.ts ***!
  \*********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   writeRAGChunks: () => (/* binding */ writeRAGChunks)\n/* harmony export */ });\nasync function writeRAGChunks(input) {\n    if (input.chunks.length !== input.vectors.length) {\n        throw new Error(`Chunk/vector count mismatch: received ${input.chunks.length} chunks and ${input.vectors.length} vectors.`);\n    }\n    void input.forceReingest;\n    return {\n        chunksWritten: input.chunks.length\n    };\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9saWIvcmFnL3ZlY3Rvci1zdG9yZS50cyIsIm1hcHBpbmdzIjoiOzs7O0FBR08sZUFBZUEsZUFBZUMsS0FJcEM7SUFDQyxJQUFJQSxNQUFNQyxNQUFNLENBQUNDLE1BQU0sS0FBS0YsTUFBTUcsT0FBTyxDQUFDRCxNQUFNLEVBQUU7UUFDaEQsTUFBTSxJQUFJRSxNQUNSLENBQUMsc0NBQXNDLEVBQUVKLE1BQU1DLE1BQU0sQ0FBQ0MsTUFBTSxDQUFDLFlBQVksRUFBRUYsTUFBTUcsT0FBTyxDQUFDRCxNQUFNLENBQUMsU0FBUyxDQUFDO0lBRTlHO0lBRUEsS0FBS0YsTUFBTUssYUFBYTtJQUV4QixPQUFPO1FBQ0xDLGVBQWVOLE1BQU1DLE1BQU0sQ0FBQ0MsTUFBTTtJQUNwQztBQUNGIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vdGhvbWFzaGFkZGVuLWFpLy4vbGliL3JhZy92ZWN0b3Itc3RvcmUudHM/MWU3NSJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgdHlwZSB7IFJBR0NodW5rIH0gZnJvbSAnQC9saWIvcmFnL2NodW5raW5nJztcbmltcG9ydCB0eXBlIHsgRW1iZWRkaW5nVmVjdG9yIH0gZnJvbSAnQC9saWIvcmFnL2VtYmVkZGluZyc7XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiB3cml0ZVJBR0NodW5rcyhpbnB1dDoge1xuICBjaHVua3M6IFJBR0NodW5rW107XG4gIHZlY3RvcnM6IEVtYmVkZGluZ1ZlY3RvcltdO1xuICBmb3JjZVJlaW5nZXN0PzogYm9vbGVhbjtcbn0pOiBQcm9taXNlPHsgY2h1bmtzV3JpdHRlbjogbnVtYmVyIH0+IHtcbiAgaWYgKGlucHV0LmNodW5rcy5sZW5ndGggIT09IGlucHV0LnZlY3RvcnMubGVuZ3RoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgYENodW5rL3ZlY3RvciBjb3VudCBtaXNtYXRjaDogcmVjZWl2ZWQgJHtpbnB1dC5jaHVua3MubGVuZ3RofSBjaHVua3MgYW5kICR7aW5wdXQudmVjdG9ycy5sZW5ndGh9IHZlY3RvcnMuYFxuICAgICk7XG4gIH1cblxuICB2b2lkIGlucHV0LmZvcmNlUmVpbmdlc3Q7XG5cbiAgcmV0dXJuIHtcbiAgICBjaHVua3NXcml0dGVuOiBpbnB1dC5jaHVua3MubGVuZ3RoXG4gIH07XG59XG4iXSwibmFtZXMiOlsid3JpdGVSQUdDaHVua3MiLCJpbnB1dCIsImNodW5rcyIsImxlbmd0aCIsInZlY3RvcnMiLCJFcnJvciIsImZvcmNlUmVpbmdlc3QiLCJjaHVua3NXcml0dGVuIl0sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(rsc)/./lib/rag/vector-store.ts\n");

/***/ })

};
;