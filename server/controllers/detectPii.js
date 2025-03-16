const { PythonShell } = require('python-shell');


async function detectPii(text) {
    if (!text) {
        return res.status(400).json({ error: "Text parameter is required" });
    }

    let options = {
        pythonPath: '/usr/bin/python3',
        args: [text],
        pythonOptions: ['-u'],
        scriptPath: './utils',
    };

    try {
        let result = await PythonShell.run('model.py', options);
        if (result[0]=="No entities detected.") { 
             return { success : false, error: "Text contains no PII data" };
        } else {
            const cleanedString = result[0]
            .replace(/'/g, '"')
            .replace(/\s([a-zA-Z0-9_]+):/g, '"$1":');
            return JSON.parse(cleanedString);
        }
    } catch (error) {
        console.error("Error executing Python script:", error);
        return { error: "Error executing Python script", details: error.message };
    }
}

module.exports = detectPii;