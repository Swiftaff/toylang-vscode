const vscode = require("vscode");
const util = require("util");
const exec = util.promisify(require("child_process").exec);

let timeout;
let activeEditor;

// create a decorator type that we use to decorate tokens
const tokenDecorationType = vscode.window.createTextEditorDecorationType({
    borderWidth: "1px",
    borderStyle: "solid",
    borderRadius: "2px",
    //overviewRulerColor: "blue",
    //overviewRulerLane: vscode.OverviewRulerLane.Left,
    light: {
        // this color will be used in light color themes
        borderColor: "darkblue",
    },
    dark: {
        // this color will be used in dark color themes
        borderColor: "grey",
    },
});

// This method is called when your extension is activated
function activate(context) {
    activeEditor = vscode.window.activeTextEditor;
    if (activeEditor) triggerUpdateDecorations("extension activated");

    let disposable1 = vscode.window.onDidChangeActiveTextEditor((editor) => {
        activeEditor = editor;
        triggerUpdateDecorations("tab switched");
    });

    let disposable2 = vscode.workspace.onDidChangeTextDocument((event) =>
        triggerUpdateDecorations("doc changed", true)
    );

    context.subscriptions.push(disposable1);
    context.subscriptions.push(disposable2);
}

function triggerUpdateDecorations(text, throttle = false) {
    console.log("triggerUpdateDecorations:", text);
    if (timeout) {
        clearTimeout(timeout);
        timeout = undefined;
    }

    if (throttle) timeout = setTimeout(updateDecorations, 500);
    else updateDecorations();
}

async function updateDecorations() {
    if (activeEditor && activeEditor.document.languageId === "toylang") {
        const text = activeEditor.document.getText();
        const output = await runBinary(text);
        try {
            const jsonOutput = JSON.parse(output);
            const token_decorations = [];
            console.log("updateDecorations:", jsonOutput);

            if (Array.isArray(jsonOutput)) {
                for (line_num in jsonOutput) {
                    const line = jsonOutput[line_num];
                    if (Array.isArray(line)) {
                        for (token of line) {
                            if (Array.isArray(token) && token.length === 4 && line_num !== 0) {
                                const token_text = token[0];
                                const startPos = new vscode.Position(line_num, token[2]);
                                const endPos = new vscode.Position(line_num, token[3] + 1);
                                console.log(token_text, line_num, startPos, endPos);
                                const decoration = {
                                    range: new vscode.Range(startPos, endPos),
                                    hoverMessage: token_text,
                                };
                                token_decorations.push(decoration);
                            }
                        }
                    }
                }
            }
            activeEditor.setDecorations(tokenDecorationType, token_decorations);
            //console.log(activeEditor);
        } catch (err) {
            console.log(`updateDecorations parse error: ${err}`);
        }
    }
}

async function runBinary(code) {
    const code_base64 = Buffer.from(code, "utf8").toString("base64");
    const command = "toylang.exe -n -t -c -i " + code_base64;
    const { stdout, stderr } = await exec(command);
    if (stderr) {
        console.error(`runBinary Error output: ${stderr}`);
        return "[]";
    }
    return stdout;
}

// this method is called when your extension is deactivated
function deactivate() {}

module.exports = { activate, deactivate };
