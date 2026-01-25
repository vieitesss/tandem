const { EventEmitter } = require("events");

const createRealtimeBus = () => {
  const emitter = new EventEmitter();
  emitter.setMaxListeners(0);

  const emitChange = (table) => {
    if (!table) {
      return;
    }

    emitter.emit("change", {
      table,
      timestamp: new Date().toISOString(),
    });
  };

  const subscribe = (tables, callback) => {
    const tableSet = new Set(
      (tables || [])
        .map((table) => String(table || "").trim())
        .filter((table) => table.length > 0)
    );

    const handler = (payload) => {
      if (tableSet.size === 0 || tableSet.has(payload.table)) {
        callback(payload);
      }
    };

    emitter.on("change", handler);

    return () => {
      emitter.off("change", handler);
    };
  };

  return { emitChange, subscribe };
};

module.exports = { createRealtimeBus };
