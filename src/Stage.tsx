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
    // Legacy narrator settings (optional)
    poe_api_key?: string;
    narrator_model?: string;
    campus_name?: string;
    narrative_style?: string;
    
    // Visual Scene Composer settings
    chub_api_key?: string;
    image_api_provider?: 'chub' | 'poe-flux';
    image_quality?: 'standard' | 'high';
    max_characters?: number;
    scene_style?: string;
    enable_refinement?: boolean;
};

type InitStateType = {
    narrator_active?: boolean;
};

type ChatStateType = {
    chronicle_entries?: any[];
};

// Visual Scene Composer interfaces
interface SceneContext {
    characters: string[];
    location: string;
    actions: string;
    mood: string;
    timeOfDay: string;
}

interface CharacterReference {
    characterId: string;
    name: string;
    avatarUrl: string;
    galleryImages: string[];
    description: string;
}

interface VisualComposerState {
    currentNarrative: string;
    sceneDetails: any;
    isGenerating: boolean;
    lastGeneratedImage?: string;
    sceneContext?: SceneContext;
    availableCharacters: CharacterReference[];
    generationProgress: string;
}

export class Stage extends StageBase<InitStateType, ChatStateType, MessageStateType, ConfigType> {
    
    // Visual Scene Composer state
    visualState: VisualComposerState;
    
    // Configuration
    private poeApiKey: string;
    private chubApiKey: string;
    private imageApiProvider: 'chub' | 'poe-flux';
    private imageQuality: 'standard' | 'high';
    private maxCharacters: number;
    private sceneStyle: string;
    private enableRefinement: boolean;
    
    // Legacy narrator settings
    private narratorModel: string;
    private campusName: string;
    private narrativeStyle: string;

    constructor(data: InitialData<InitStateType, ChatStateType, MessageStateType, ConfigType>) {
        super(data);
        const { config, messageState } = data;
        
        // Initialize Visual Scene Composer configuration
        this.chubApiKey = config?.chub_api_key || "";
        this.imageApiProvider = config?.image_api_provider || "chub";
        this.imageQuality = config?.image_quality || "standard";
        this.maxCharacters = config?.max_characters || 3;
        this.sceneStyle = config?.scene_style || "cinematic";
        this.enableRefinement = config?.enable_refinement || false;
        
        // Legacy narrator configuration
        this.poeApiKey = config?.poe_api_key || "";
        this.narratorModel = config?.narrator_model || "GPT-5-nano";
        this.campusName = config?.campus_name || "National Law University";
        this.narrativeStyle = config?.narrative_style || "detailed";
        
        // Initialize Visual Scene Composer state
        this.visualState = {
            currentNarrative: messageState?.last_narrative || "",
            sceneDetails: messageState?.scene_context || {},
            isGenerating: false,
            lastGeneratedImage: undefined,
            sceneContext: undefined,
            availableCharacters: [],
            generationProgress: "Ready"
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
            this.visualState = {
                ...this.visualState,
                currentNarrative: state.last_narrative || this.visualState.currentNarrative,
                sceneDetails: state.scene_context || this.visualState.sceneDetails
            };
        }
    }

    // Legacy narrator functions removed - Visual Scene Composer only

    async beforePrompt(userMessage: Message): Promise<Partial<StageResponse<ChatStateType, MessageStateType>>> {
        // NO AUTO-GENERATION - Store context for on-demand use only
        const { content } = userMessage;
        
        return {
            stageDirections: null,
            messageState: {
                scene_context: { lastUserMessage: content },
                narrator_active: false
            },
            modifiedMessage: null,
            systemMessage: null,
            error: null,
            chatState: null,
        };
    }

    async afterResponse(botMessage: Message): Promise<Partial<StageResponse<ChatStateType, MessageStateType>>> {
        // NO AUTO-GENERATION - Store context for on-demand use only  
        const { content } = botMessage;
        
        return {
            stageDirections: null,
            messageState: {
                scene_context: { 
                    lastBotMessage: content
                },
                narrator_active: false
            },
            modifiedMessage: null,
            systemMessage: null,
            error: null,
            chatState: null
        };
    }

    // Legacy toggle function removed

    // Visual Scene Composer - Chub Image API Integration
    private async generateSceneImage(prompt: string, referenceUrl?: string): Promise<string | null> {
        if (!this.chubApiKey) {
            console.error("No Chub API key configured");
            return null;
        }

        const baseUrl = "https://api.chub.ai";
        const endpoint = referenceUrl ? "/images/img2img" : "/images/text2img";
        
        const payload: any = {
            prompt: prompt,
            width: 1024,
            height: 1024,
            num_inference_steps: this.imageQuality === 'high' ? 50 : 30,
            guidance_scale: 3.5
        };

        if (referenceUrl) {
            payload.init_image = referenceUrl;
            payload.strength = 0.7;
        }

        try {
            // Initial generation request
            const response = await axios.post(`${baseUrl}${endpoint}`, payload, {
                headers: {
                    'Authorization': `Bearer ${this.chubApiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            });

            const generationUuid = response.data?.generation_uuid;
            if (!generationUuid) {
                console.error("No generation UUID received");
                return null;
            }

            // Poll for completion
            const maxAttempts = 30;
            const pollInterval = 2000;

            for (let attempt = 1; attempt <= maxAttempts; attempt++) {
                this.visualState.generationProgress = `Generating... ${attempt}/${maxAttempts}`;
                this.forceUpdate();

                await new Promise(resolve => setTimeout(resolve, pollInterval));

                try {
                    const checkResponse = await axios.post(`${baseUrl}/check`, {
                        generation_uuid: generationUuid,
                        request_type: "image"
                    }, {
                        headers: {
                            'Authorization': `Bearer ${this.chubApiKey}`,
                            'Content-Type': 'application/json'
                        },
                        timeout: 5000
                    });

                    const result = checkResponse.data;
                    const status = result.status || result.state;

                    if (status === 'completed') {
                        const imageUrl = result.image_url || result.url;
                        if (imageUrl) {
                            return imageUrl;
                        }
                        if (result.images && result.images.length > 0) {
                            return result.images[0];
                        }
                    } else if (status === 'failed' || status === 'error') {
                        console.error("Generation failed:", result);
                        return null;
                    }
                } catch (pollError) {
                    console.warn(`Poll attempt ${attempt} failed:`, pollError);
                }
            }

            console.error("Generation timed out");
            return null;
        } catch (error) {
            console.error("Image generation error:", error);
            return null;
        }
    }

    // Main scene capture function - triggered by button press
    private captureScene = async () => {
        if (this.visualState.isGenerating) return;
        
        this.visualState.isGenerating = true;
        this.visualState.generationProgress = "Analyzing scene context...";
        this.forceUpdate();

        try {
            // Parse scene context from recent messages
            const sceneContext = await this.parseSceneContext();
            this.visualState.sceneContext = sceneContext;
            
            // Create scene prompt
            const scenePrompt = this.createScenePrompt(sceneContext);
            
            // Generate image
            this.visualState.generationProgress = "Generating scene image...";
            this.forceUpdate();
            
            const imageUrl = await this.generateSceneImage(scenePrompt);
            
            if (imageUrl) {
                this.visualState.lastGeneratedImage = imageUrl;
                this.visualState.generationProgress = "Scene captured successfully!";
            } else {
                this.visualState.generationProgress = "Generation failed";
            }
            
        } catch (error) {
            console.error("Scene capture error:", error);
            this.visualState.generationProgress = "Error occurred";
        } finally {
            this.visualState.isGenerating = false;
            this.forceUpdate();
            
            // Reset progress after 3 seconds
            setTimeout(() => {
                this.visualState.generationProgress = "Ready";
                this.forceUpdate();
            }, 3000);
        }
    }

    private async parseSceneContext(): Promise<SceneContext> {
        // Basic scene context parsing - will enhance later
        const sceneContext: SceneContext = {
            characters: ["main character"], // Will implement character detection
            location: "university campus",
            actions: "conversation",
            mood: "neutral",
            timeOfDay: "day"
        };
        
        // TODO: Implement actual message parsing and character extraction
        return sceneContext;
    }

    private createScenePrompt(context: SceneContext): string {
        return `${this.sceneStyle} scene: ${context.characters.join(' and ')} ${context.actions} at ${context.location}, ${context.mood} mood, ${context.timeOfDay} lighting, high quality, detailed`;
    }

    private forceUpdate = () => {
        // Simple re-render trigger for React
        this.visualState = { ...this.visualState };
    }

    render(): ReactElement {
        return (
            <div style={{
                width: '100%',
                height: '100%',
                padding: '20px',
                background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
                color: '#ffffff',
                fontFamily: 'sans-serif',
                overflow: 'auto'
            }}>
                {/* Header */}
                <div style={{ marginBottom: '20px' }}>
                    <h3 style={{ margin: '0 0 10px 0', color: '#ffd700' }}>
                        📸 Visual Scene Composer
                    </h3>
                    <div style={{ fontSize: '14px', opacity: 0.8 }}>
                        {this.sceneStyle} • {this.imageApiProvider} • {this.imageQuality}
                    </div>
                </div>

                {/* Scene Capture Controls */}
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
                        <strong style={{ color: '#ffd700' }}>📸 Scene Capture</strong>
                        <button
                            onClick={this.captureScene}
                            disabled={this.visualState.isGenerating}
                            style={{
                                background: this.visualState.isGenerating ? '#666' : '#4a9eff',
                                border: 'none',
                                color: 'white',
                                padding: '8px 16px',
                                borderRadius: '15px',
                                cursor: this.visualState.isGenerating ? 'not-allowed' : 'pointer',
                                fontSize: '14px',
                                fontWeight: 'bold'
                            }}
                        >
                            {this.visualState.isGenerating ? '⏳ Generating...' : '📸 Capture Scene'}
                        </button>
                    </div>
                    
                    {/* Progress indicator */}
                    <div style={{
                        fontSize: '12px',
                        color: this.visualState.isGenerating ? '#4a9eff' : '#ffd700',
                        marginBottom: '10px'
                    }}>
                        Status: {this.visualState.generationProgress}
                    </div>

                    {/* Generated image display */}
                    {this.visualState.lastGeneratedImage && (
                        <div style={{ marginTop: '15px' }}>
                            <img 
                                src={this.visualState.lastGeneratedImage} 
                                style={{ 
                                    width: '100%', 
                                    maxHeight: '300px',
                                    objectFit: 'cover',
                                    borderRadius: '10px',
                                    border: '2px solid rgba(255,215,0,0.5)'
                                }}
                                alt="Generated scene"
                            />
                        </div>
                    )}

                    {/* Scene context display */}
                    {this.visualState.sceneContext && (
                        <div style={{
                            marginTop: '10px',
                            fontSize: '12px',
                            opacity: 0.7,
                            fontStyle: 'italic'
                        }}>
                            Scene: {this.visualState.sceneContext.characters.join(', ')} • {this.visualState.sceneContext.location} • {this.visualState.sceneContext.mood}
                        </div>
                    )}
                </div>

                {/* API Status */}
                <div style={{
                    fontSize: '12px',
                    opacity: 0.7,
                    textAlign: 'center'
                }}>
                    {this.chubApiKey ? 
                        `🟢 Connected to Chub ${this.imageApiProvider}` : 
                        "⚠️ No Chub API key configured"
                    }
                </div>
            </div>
        );
    }
}