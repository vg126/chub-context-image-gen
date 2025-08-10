import {ReactElement} from "react";
import {StageBase, StageResponse, InitialData, Message} from "@chub-ai/stages-ts";
import {LoadResponse} from "@chub-ai/stages-ts/dist/types/load";
import axios from "axios";

/***
 NLU Narrator Stage - Campus chronicler for Law Hearts & Hidden Connections universe
 ***/

// Type definitions for narrator state
type MessageStateType = {
    last_narrative?: string;
    scene_context?: any;
    narrator_active?: boolean;
};

type ConfigType = {
    poe_api_key?: string;
    narrator_model?: string;
    campus_name?: string;
    narrative_style?: string;
};

type InitStateType = {
    narrator_active?: boolean;
};

type ChatStateType = {
    chronicle_entries?: any[];
};

interface NarratorInternalState {
    currentNarrative: string;
    sceneDetails: any;
    isNarrating: boolean;
    chronicleHistory: any[];
}

export class Stage extends StageBase<InitStateType, ChatStateType, MessageStateType, ConfigType> {
    
    narratorState: NarratorInternalState;
    private poeApiKey: string;
    private narratorModel: string;
    private campusName: string;
    private narrativeStyle: string;

    constructor(data: InitialData<InitStateType, ChatStateType, MessageStateType, ConfigType>) {
        super(data);
        const { config, messageState } = data;
        
        // Initialize narrator configuration
        this.poeApiKey = config?.poe_api_key || "";
        this.narratorModel = config?.narrator_model || "GPT-5-nano";
        this.campusName = config?.campus_name || "National Law University";
        this.narrativeStyle = config?.narrative_style || "detailed";
        
        // Initialize narrator state
        this.narratorState = {
            currentNarrative: messageState?.last_narrative || "",
            sceneDetails: messageState?.scene_context || {},
            isNarrating: messageState?.narrator_active || false,
            chronicleHistory: []
        };
    }

    async load(): Promise<Partial<LoadResponse<InitStateType, ChatStateType, MessageStateType>>> {
        return {
            success: true,
            error: null,
            initState: { narrator_active: false },
            chatState: { chronicle_entries: [] },
        };
    }

    async setState(state: MessageStateType): Promise<void> {
        if (state != null) {
            this.narratorState = {
                ...this.narratorState,
                currentNarrative: state.last_narrative || this.narratorState.currentNarrative,
                sceneDetails: state.scene_context || this.narratorState.sceneDetails,
                isNarrating: state.narrator_active !== undefined ? state.narrator_active : this.narratorState.isNarrating
            };
        }
    }

    // Core narrator functionality - generates narrative using Poe API
    private async generateNarrative(messageContent: string, isUserMessage: boolean): Promise<string> {
        if (!this.poeApiKey) {
            return "";
        }

        const narrativePrompt = this.createNarrativePrompt(messageContent, isUserMessage);
        
        try {
            const response = await axios.post('https://api.poe.com/v1/chat/completions', {
                model: this.narratorModel,
                messages: [
                    {
                        role: "system",
                        content: `You are a campus chronicler for ${this.campusName}. Generate ${this.narrativeStyle} narrative observations about the scene unfolding. Focus on atmospheric details, character actions, and campus environment. Keep responses concise but evocative.`
                    },
                    {
                        role: "user", 
                        content: narrativePrompt
                    }
                ],
                max_tokens: 200,
                temperature: 0.7
            }, {
                headers: {
                    'Authorization': `Bearer ${this.poeApiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            return response.data.choices[0]?.message?.content || "";
        } catch (error) {
            console.error("Narrator API error:", error);
            return "";
        }
    }

    private createNarrativePrompt(messageContent: string, isUserMessage: boolean): string {
        const speaker = isUserMessage ? "student" : "character";
        return `The ${speaker} just said: "${messageContent}". 
                Generate a brief atmospheric narrative describing the campus scene, 
                character expressions, environmental details, or emotional undertones. 
                Campus setting: ${this.campusName}. 
                Style: ${this.narrativeStyle}.`;
    }

    async beforePrompt(userMessage: Message): Promise<Partial<StageResponse<ChatStateType, MessageStateType>>> {
        const { content } = userMessage;
        
        // Generate narrative for user message
        const narrative = await this.generateNarrative(content, true);
        
        // Update narrator state
        this.narratorState.currentNarrative = narrative;
        this.narratorState.isNarrating = true;
        
        return {
            stageDirections: narrative ? `[Campus Chronicle: ${narrative}]` : null,
            messageState: {
                last_narrative: narrative,
                scene_context: { lastUserMessage: content },
                narrator_active: true
            },
            modifiedMessage: null,
            systemMessage: narrative ? `📖 *${narrative}*` : null,
            error: null,
            chatState: null,
        };
    }

    async afterResponse(botMessage: Message): Promise<Partial<StageResponse<ChatStateType, MessageStateType>>> {
        const { content } = botMessage;
        
        // Generate narrative for bot response
        const narrative = await this.generateNarrative(content, false);
        
        // Update narrator state
        this.narratorState.currentNarrative = narrative;
        
        return {
            stageDirections: null,
            messageState: {
                last_narrative: narrative,
                scene_context: { 
                    lastBotMessage: content,
                    narrativeGenerated: !!narrative 
                },
                narrator_active: true
            },
            modifiedMessage: null,
            systemMessage: narrative ? `📖 *${narrative}*` : null,
            error: null,
            chatState: null
        };
    }

    private toggleNarrator = () => {
        this.narratorState.isNarrating = !this.narratorState.isNarrating;
        this.forceUpdate();
    }

    private forceUpdate = () => {
        // Simple re-render trigger
        this.narratorState = { ...this.narratorState };
    }

    render(): ReactElement {
        return (
            <div style={{
                width: '100%',
                height: '100%',
                padding: '20px',
                background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
                color: '#ffffff',
                fontFamily: 'serif',
                overflow: 'auto'
            }}>
                <div style={{ marginBottom: '20px' }}>
                    <h3 style={{ margin: '0 0 10px 0', color: '#ffd700' }}>
                        📖 NLU Campus Chronicle
                    </h3>
                    <div style={{ fontSize: '14px', opacity: 0.8 }}>
                        {this.campusName} • {this.narrativeStyle} style
                    </div>
                </div>

                <div style={{
                    background: 'rgba(255,255,255,0.1)',
                    borderRadius: '10px',
                    padding: '15px',
                    marginBottom: '15px',
                    border: '1px solid rgba(255,215,0,0.3)'
                }}>
                    <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '10px'
                    }}>
                        <strong style={{ color: '#ffd700' }}>Narrator Status</strong>
                        <button
                            onClick={this.toggleNarrator}
                            style={{
                                background: this.narratorState.isNarrating ? '#4a9eff' : '#666',
                                border: 'none',
                                color: 'white',
                                padding: '5px 15px',
                                borderRadius: '15px',
                                cursor: 'pointer',
                                fontSize: '12px'
                            }}
                        >
                            {this.narratorState.isNarrating ? '✨ Active' : '⏸️ Paused'}
                        </button>
                    </div>
                    
                    {this.narratorState.currentNarrative && (
                        <div style={{
                            fontStyle: 'italic',
                            color: '#e6f3ff',
                            lineHeight: '1.4',
                            borderLeft: '3px solid #ffd700',
                            paddingLeft: '10px'
                        }}>
                            {this.narratorState.currentNarrative}
                        </div>
                    )}
                    
                    {!this.narratorState.currentNarrative && (
                        <div style={{ opacity: 0.6, fontStyle: 'italic' }}>
                            Waiting for conversation to begin...
                        </div>
                    )}
                </div>

                <div style={{
                    fontSize: '12px',
                    opacity: 0.7,
                    textAlign: 'center'
                }}>
                    {this.poeApiKey ? 
                        `Connected to ${this.narratorModel}` : 
                        "⚠️ No Poe API key configured"
                    }
                </div>
            </div>
        );
    }
}