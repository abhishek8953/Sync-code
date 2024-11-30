import React, { useEffect, useRef } from 'react';
import Codemirror from 'codemirror';
import 'codemirror/lib/codemirror.css';
import 'codemirror/theme/dracula.css';
import 'codemirror/mode/javascript/javascript';  // JavaScript mode
import 'codemirror/addon/edit/closetag'; // Auto-close tags
import 'codemirror/addon/edit/closebrackets'; // Auto-close brackets
import 'codemirror/addon/hint/show-hint'; // Show hints
import 'codemirror/addon/hint/show-hint.css'; // Hint CSS
import 'codemirror/addon/hint/javascript-hint';  // JavaScript-specific hints

import ACTIONS from '../Actions';

const Editor = ({ socketRef, roomId, onCodeChange }) => {
    const editorRef = useRef(null);
    let debounceTimeout = useRef(null); // Using ref for managing timeout to avoid unnecessary re-renders

    useEffect(() => {
        async function init() {
            editorRef.current = Codemirror.fromTextArea(
                document.getElementById('realtimeEditor'),
                {
                    mode: 'javascript', // Set to JavaScript mode
                    theme: 'dracula',
                    autoCloseTags: true,
                    autoCloseBrackets: true,
                    lineNumbers: true,
                    extraKeys: {
                        // Prevent manual triggering
                        "Ctrl-Space": "autocomplete", 
                    },
                    hintOptions: {
                        completeSingle: false, // Avoid auto-selection of first suggestion
                    },
                }
            );

            // Automatically show suggestions with debounce
            editorRef.current.on('change', (instance, changes) => {
                const { origin } = changes;
                const code = instance.getValue();

                // Avoid excessive showHint calls
                if (origin !== 'setValue') {
                    if (debounceTimeout.current) {
                        clearTimeout(debounceTimeout.current); // Clear the previous timeout
                    }

                    debounceTimeout.current = setTimeout(() => {
                        // Only show hints if it's JavaScript mode
                        if (instance.getMode().name === 'javascript') {
                            instance.showHint(); // Show suggestions for JavaScript
                        }
                    }, 600); // Adjust the delay as needed
                }

                // Notify parent about the code change
                onCodeChange(code);
                if (origin !== 'setValue') {
                    socketRef.current.emit(ACTIONS.CODE_CHANGE, {
                        roomId,
                        code,
                    });
                }
            });
        }

        init();
        
        return () => {
            if (debounceTimeout.current) {
                clearTimeout(debounceTimeout.current); // Clean up on unmount
            }
        };

    }, []); // Empty dependency array to run once on mount

    useEffect(() => {
        if (socketRef.current) {
            socketRef.current.on(ACTIONS.CODE_CHANGE, ({ code }) => {
                if (code !== null) {
                    editorRef.current.setValue(code);
                }
            });
        }

        return () => {
            socketRef.current.off(ACTIONS.CODE_CHANGE);
        };
    }, [socketRef.current]);

    return (
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
            <div
                style={{
                    flex: 1, // Allow the editor to take up all available space
                    margin: '20px', // Add some margin around the editor
                    overflow: 'auto', // Ensure it scrolls if the content exceeds the height
                }}
            >
                <textarea id="realtimeEditor" style={{ width: '100%', height: '100%' }} />
            </div>
        </div>
    );
};

export default Editor;
