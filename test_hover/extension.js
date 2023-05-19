const vscode = require("vscode");
const util = require("util");
const exec = util.promisify(require("child_process").exec);

let timeout;
let activeEditor;

// create a decorator type that we use to decorate tokens
const tokenDecorationType = vscode.window.createTextEditorDecorationType({
    borderWidth: "1px",
    borderStyle: "dotted",
    borderRadius: "2px",
    light: {
        // this color will be used in light color themes
        borderColor: "darkblue",
    },
    dark: {
        // this color will be used in dark color themes
        borderColor: "#444",
    },
});

const tokenDecorationHighlightType = vscode.window.createTextEditorDecorationType({
    borderWidth: "2px",
    borderStyle: "solid",
    borderRadius: "2px",
    light: {
        // this color will be used in light color themes
        borderColor: "blue",
    },
    dark: {
        // this color will be used in dark color themes
        borderColor: "#999",
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

    let disposable2 = vscode.workspace.onDidChangeTextDocument((event) => {
        triggerUpdateDecorations("doc changed", true);
    });

    let disposable3 = vscode.languages.registerHoverProvider("toylang", {
        provideHover(document, position, token) {
            //console.log(position);
            triggerUpdateDecorations("hovered");
        },
    });

    context.subscriptions.push(disposable1);
    context.subscriptions.push(disposable2);
    context.subscriptions.push(disposable3);
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
        const cursor = activeEditor.selections[0].start;
        //console.log(cursor);
        const text = activeEditor.document.getText();
        const output = await runBinary(text);
        try {
            const jsonOutput = JSON.parse(output);
            const token_decorations = [];
            const token_decoration_highlights = [];

            if (Array.isArray(jsonOutput)) {
                jsonOutput.forEach((line, line_num) => {
                    if (Array.isArray(line)) {
                        line.forEach((token, _token_num) => {
                            if (Array.isArray(token) && token.length === 4) {
                                const token_text = token[0];
                                const startPos = new vscode.Position(line_num, token[2]);
                                const endPos = new vscode.Position(line_num, token[3] + 1);
                                const decoration = {
                                    range: new vscode.Range(startPos, endPos),
                                    hoverMessage: token_text,
                                };
                                const cursor_is_on_same_line = cursor.line === line_num;
                                const cursor_is_after_token_start = cursor.e >= token[2];
                                const cursor_is_before_token_end = cursor.e <= token[3] + 1;
                                /*console.log(
                                    cursor_is_on_same_line,
                                    cursor_is_after_token_start,
                                    cursor_is_before_token_end
                                );*/
                                const cursor_is_in_this_token =
                                    cursor_is_on_same_line && cursor_is_after_token_start && cursor_is_before_token_end;
                                if (cursor_is_in_this_token) {
                                    //console.log(token, cursor, token[2], token[3] + 1);
                                    token_decoration_highlights.push(decoration);
                                } else {
                                    token_decorations.push(decoration);
                                }
                            }
                        });
                    }
                });
            }
            activeEditor.setDecorations(tokenDecorationType, token_decorations);
            activeEditor.setDecorations(tokenDecorationHighlightType, token_decoration_highlights);
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
