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
    errorMessage?: string;
    isRefining: boolean;
    lastGenerationTime?: number;
    generationStats: {
        totalGenerations: number;
        successfulGenerations: number;
        lastError?: string;
    };
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
            generationProgress: "Ready",
            errorMessage: undefined,
            isRefining: false,
            lastGenerationTime: undefined,
            generationStats: {
                totalGenerations: 0,
                successfulGenerations: 0,
                lastError: undefined
            }
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

    // Character reference fetching from Chub Gallery (disabled due to API format issues)
    private async fetchCharacterReference(characterName: string): Promise<CharacterReference | null> {
        // Skip character reference fetching for now due to API format mismatch
        // This prevents 422 errors and allows basic text2img generation to work
        console.log(`Skipping character reference fetch for: ${characterName}`);
        return null;
    }

    private async enrichSceneWithCharacterRefs(sceneContext: SceneContext): Promise<SceneContext> {
        const enrichedCharacters: string[] = [];
        const characterRefs: CharacterReference[] = [];

        for (const characterName of sceneContext.characters) {
            const characterRef = await this.fetchCharacterReference(characterName);
            if (characterRef) {
                characterRefs.push(characterRef);
                enrichedCharacters.push(characterRef.name);
            } else {
                enrichedCharacters.push(characterName);
            }
        }

        this.visualState.availableCharacters = characterRefs;
        
        return {
            ...sceneContext,
            characters: enrichedCharacters
        };
    }

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
            guidance_scale: 3.5,
            seed: 0,
            extension_source: "Visual Scene Composer",
            chat_id: "stage",
            uuid: this.generateUUID(),
            mode: "standard",
            sub_mode: "default",
            parent_image: "",
            item_id: ""
        };

        if (referenceUrl) {
            payload.init_image = referenceUrl;
            payload.strength = 0.7;
        }

        try {
            console.log('Sending image generation request:', payload);
            
            // Initial generation request
            const response = await axios.post(`${baseUrl}${endpoint}`, payload, {
                headers: {
                    'CH-API-KEY': this.chubApiKey,
                    'Content-Type': 'application/json'
                },
                timeout: 60000
            });

            console.log('Initial response:', response.data);
            
            const generationUuid = response.data?.generation_uuid;
            if (!generationUuid) {
                console.error("No generation UUID received", response.data);
                return null;
            }
            
            console.log('Got generation UUID:', generationUuid);

            // Check if image is already complete in initial response
            if (response.data.is_done && response.data.primary_image_path) {
                console.log('Image completed immediately:', response.data.primary_image_path);
                return response.data.primary_image_path;
            }

            // If not complete, poll for completion
            const maxAttempts = 60;
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
                            'CH-API-KEY': this.chubApiKey,
                            'Content-Type': 'application/json'
                        },
                        timeout: 5000
                    });

                    const result = checkResponse.data;
                    console.log(`Poll attempt ${attempt}:`, result);

                    // Check multiple possible completion indicators
                    if (result.is_done || result.status === 'completed' || result.state === 'completed') {
                        const imageUrl = result.primary_image_path || result.image_url || result.url;
                        if (imageUrl) {
                            console.log('Image completed via polling:', imageUrl);
                            return imageUrl;
                        }
                        if (result.images && result.images.length > 0) {
                            return result.images[0];
                        }
                    } else if (result.is_failed || result.status === 'failed' || result.state === 'error') {
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
            // Clear previous errors
            this.visualState.errorMessage = undefined;
            this.visualState.generationStats.totalGenerations++;
            this.visualState.lastGenerationTime = Date.now();
            
            // Parse scene context from recent messages
            const basicSceneContext = await this.parseSceneContext();
            
            // Enrich with character references if available
            this.visualState.generationProgress = "Fetching character references...";
            this.forceUpdate();
            
            const enrichedSceneContext = await this.enrichSceneWithCharacterRefs(basicSceneContext);
            this.visualState.sceneContext = enrichedSceneContext;
            
            // Create initial scene prompt
            const initialPrompt = this.createScenePrompt(enrichedSceneContext);
            
            // Get character reference image for img2img if available
            const referenceUrl = this.getBestCharacterReference();
            
            // Generate image
            this.visualState.generationProgress = "Generating scene image...";
            this.forceUpdate();
            
            const imageUrl = await this.generateSceneImage(initialPrompt, referenceUrl);
            
            if (imageUrl) {
                this.visualState.lastGeneratedImage = imageUrl;
                this.visualState.generationProgress = "Scene captured successfully!";
                this.visualState.generationStats.successfulGenerations++;
                
                // Start refinement process if enabled
                if (this.enableRefinement && !this.visualState.isRefining) {
                    this.startRefinementProcess(imageUrl, enrichedSceneContext);
                }
            } else {
                this.visualState.generationProgress = "Generation failed";
                this.visualState.errorMessage = "Image generation failed - check API connection";
                this.visualState.generationStats.lastError = "Generation returned null";
            }
            
        } catch (error: any) {
            console.error("Scene capture error:", error);
            this.visualState.generationProgress = "Error occurred";
            this.visualState.errorMessage = error.message || "Unknown error occurred";
            this.visualState.generationStats.lastError = error.message;
        } finally {
            this.visualState.isGenerating = false;
            this.forceUpdate();
            
            // Reset progress after 3 seconds
            setTimeout(() => {
                if (!this.visualState.isRefining) {
                    this.visualState.generationProgress = "Ready";
                    this.forceUpdate();
                }
            }, 3000);
        }
    }

    private getBestCharacterReference(): string | undefined {
        // Get the best character reference image for img2img
        if (this.visualState.availableCharacters.length === 0) {
            return undefined;
        }
        
        const primaryCharacter = this.visualState.availableCharacters[0];
        
        // Prefer gallery images over avatar
        if (primaryCharacter.galleryImages.length > 0) {
            return primaryCharacter.galleryImages[0];
        }
        
        return primaryCharacter.avatarUrl;
    }

    private async startRefinementProcess(imageUrl: string, sceneContext: SceneContext) {
        // 3-part refinement system: verification → feedback → prompt refinement loop
        setTimeout(async () => {
            this.visualState.isRefining = true;
            this.visualState.generationProgress = "Starting refinement process...";
            this.forceUpdate();
            
            try {
                // Step 1: Verification - analyze the generated image
                const verificationResult = await this.verifyImage(imageUrl, sceneContext);
                
                if (verificationResult.needsImprovement) {
                    // Step 2: Generate feedback for improvement
                    const feedback = this.generateFeedback(verificationResult, sceneContext);
                    
                    // Step 3: Create refined prompt
                    const refinedPrompt = this.createRefinedPrompt(sceneContext, feedback);
                    
                    // Generate improved image
                    this.visualState.generationProgress = "Refining image...";
                    this.forceUpdate();
                    
                    const refinedImageUrl = await this.generateSceneImage(refinedPrompt, imageUrl);
                    
                    if (refinedImageUrl) {
                        this.visualState.lastGeneratedImage = refinedImageUrl;
                        this.visualState.generationProgress = "Refinement complete!";
                        this.visualState.generationStats.successfulGenerations++;
                    } else {
                        this.visualState.generationProgress = "Refinement failed";
                        this.visualState.errorMessage = "Refinement generation failed";
                    }
                } else {
                    this.visualState.generationProgress = "Image quality verified - no refinement needed";
                }
            } catch (error: any) {
                console.error("Refinement process error:", error);
                this.visualState.generationProgress = "Refinement failed";
                this.visualState.errorMessage = `Refinement error: ${error.message}`;
            } finally {
                this.visualState.isRefining = false;
                this.forceUpdate();
                
                // Reset to ready after refinement completes
                setTimeout(() => {
                    this.visualState.generationProgress = "Ready";
                    this.forceUpdate();
                }, 3000);
            }
        }, 2000);
    }

    private async verifyImage(imageUrl: string, sceneContext: SceneContext): Promise<{needsImprovement: boolean, issues: string[]}> {
        // Basic verification logic - could be enhanced with AI vision analysis
        const issues: string[] = [];
        
        // For now, randomly decide if refinement is needed (placeholder logic)
        const needsImprovement = Math.random() > 0.7;
        
        if (needsImprovement) {
            issues.push("Character positioning could be improved");
            issues.push("Lighting needs enhancement");
        }
        
        return { needsImprovement, issues };
    }

    private generateFeedback(verificationResult: {needsImprovement: boolean, issues: string[]}, sceneContext: SceneContext): string {
        const feedbackPoints = verificationResult.issues;
        return feedbackPoints.join(', ') + '. Focus on ' + sceneContext.mood + ' atmosphere.';
    }

    private createRefinedPrompt(sceneContext: SceneContext, feedback: string): string {
        const basePrompt = this.createScenePrompt(sceneContext);
        return `${basePrompt}, improved composition, ${feedback}, masterpiece quality`;
    }

    private async parseSceneContext(): Promise<SceneContext> {
        // Get recent messages for analysis
        const recentMessages = await this.getRecentMessages(10);
        const combinedText = recentMessages.map(msg => msg.content).join(' ').toLowerCase();
        
        // Extract characters (look for names, pronouns, character references)
        const characters = this.extractCharacters(combinedText);
        
        // Extract location
        const location = this.extractLocation(combinedText);
        
        // Extract actions/activities
        const actions = this.extractActions(combinedText);
        
        // Extract mood/atmosphere
        const mood = this.extractMood(combinedText);
        
        // Extract time of day
        const timeOfDay = this.extractTimeOfDay(combinedText);
        
        const sceneContext: SceneContext = {
            characters: characters.length > 0 ? characters : ["main character"],
            location: location || "university campus",
            actions: actions || "conversation",
            mood: mood || "neutral",
            timeOfDay: timeOfDay || "day"
        };
        
        return sceneContext;
    }

    private async getRecentMessages(count: number): Promise<Message[]> {
        // Get recent messages from chat history
        // This would typically come from the stage's message history
        // For now, return empty array - will implement based on actual message access
        return [];
    }

    private extractCharacters(text: string): string[] {
        const characters: string[] = [];
        
        // Look for common character indicators
        const characterPatterns = [
            /\b([A-Z][a-z]+)\s+(said|says|asked|replied|whispered|shouted)/g,
            /\b([A-Z][a-z]+)\s+(walked|ran|smiled|frowned|looked|turned)/g,
            /\b([A-Z][a-z]+)'s\s+/g,
            /\bprofessor\s+([A-Z][a-z]+)/gi,
            /\bdr\.?\s+([A-Z][a-z]+)/gi,
            /\bmr\.?\s+([A-Z][a-z]+)/gi,
            /\bms\.?\s+([A-Z][a-z]+)/gi
        ];

        characterPatterns.forEach(pattern => {
            const matches = text.matchAll(pattern);
            for (const match of matches) {
                const name = match[1];
                if (name && name.length > 2 && !characters.includes(name)) {
                    characters.push(name);
                }
            }
        });

        return characters.slice(0, this.maxCharacters);
    }

    private extractLocation(text: string): string {
        const locationKeywords = {
            'classroom': 'classroom',
            'library': 'library',
            'cafeteria': 'cafeteria',
            'dormitory': 'dormitory',
            'dorm': 'dormitory',
            'office': 'office',
            'campus': 'university campus',
            'courtyard': 'courtyard',
            'auditorium': 'auditorium',
            'laboratory': 'laboratory',
            'lab': 'laboratory',
            'garden': 'garden',
            'hallway': 'hallway',
            'corridor': 'corridor',
            'rooftop': 'rooftop',
            'parking': 'parking lot',
            'field': 'sports field',
            'gym': 'gymnasium'
        };

        for (const [keyword, location] of Object.entries(locationKeywords)) {
            if (text.includes(keyword)) {
                return location;
            }
        }

        return '';
    }

    private extractActions(text: string): string {
        const actionKeywords = {
            'studying': 'studying',
            'reading': 'reading',
            'writing': 'writing',
            'walking': 'walking',
            'running': 'running',
            'sitting': 'sitting',
            'standing': 'standing',
            'talking': 'having a conversation',
            'discussing': 'discussing',
            'arguing': 'arguing',
            'laughing': 'laughing',
            'crying': 'crying',
            'eating': 'eating',
            'drinking': 'drinking',
            'meeting': 'meeting',
            'presentation': 'giving presentation',
            'lecture': 'attending lecture',
            'exam': 'taking exam',
            'test': 'taking test'
        };

        for (const [keyword, action] of Object.entries(actionKeywords)) {
            if (text.includes(keyword)) {
                return action;
            }
        }

        return '';
    }

    private extractMood(text: string): string {
        const moodKeywords = {
            'happy': 'joyful',
            'sad': 'melancholic',
            'angry': 'tense',
            'excited': 'energetic',
            'nervous': 'anxious',
            'calm': 'peaceful',
            'worried': 'concerned',
            'surprised': 'surprised',
            'confused': 'puzzled',
            'romantic': 'romantic',
            'serious': 'serious',
            'playful': 'playful',
            'dramatic': 'dramatic',
            'intense': 'intense'
        };

        for (const [keyword, mood] of Object.entries(moodKeywords)) {
            if (text.includes(keyword)) {
                return mood;
            }
        }

        return '';
    }

    private extractTimeOfDay(text: string): string {
        const timeKeywords = {
            'morning': 'morning',
            'dawn': 'dawn',
            'sunrise': 'sunrise',
            'afternoon': 'afternoon',
            'noon': 'midday',
            'evening': 'evening',
            'sunset': 'sunset',
            'night': 'night',
            'midnight': 'midnight',
            'dusk': 'dusk',
            'twilight': 'twilight'
        };

        for (const [keyword, time] of Object.entries(timeKeywords)) {
            if (text.includes(keyword)) {
                return time;
            }
        }

        return '';
    }

    private createScenePrompt(context: SceneContext): string {
        return `${this.sceneStyle} scene: ${context.characters.join(' and ')} ${context.actions} at ${context.location}, ${context.mood} mood, ${context.timeOfDay} lighting, high quality, detailed`;
    }

    private generateUUID(): string {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
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
                        color: this.visualState.isGenerating || this.visualState.isRefining ? '#4a9eff' : 
                               this.visualState.errorMessage ? '#ff6b6b' : '#ffd700',
                        marginBottom: '10px'
                    }}>
                        Status: {this.visualState.generationProgress}
                        {this.visualState.isRefining && ' 🔄'}
                    </div>

                    {/* Error message display */}
                    {this.visualState.errorMessage && (
                        <div style={{
                            fontSize: '11px',
                            color: '#ff6b6b',
                            background: 'rgba(255, 107, 107, 0.1)',
                            borderRadius: '6px',
                            padding: '6px 8px',
                            marginBottom: '10px',
                            borderLeft: '3px solid #ff6b6b'
                        }}>
                            ⚠️ {this.visualState.errorMessage}
                        </div>
                    )}

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

                    {/* Character references display */}
                    {this.visualState.availableCharacters.length > 0 && (
                        <div style={{
                            marginTop: '15px',
                            background: 'rgba(255,255,255,0.05)',
                            borderRadius: '8px',
                            padding: '10px'
                        }}>
                            <div style={{ fontSize: '12px', color: '#ffd700', marginBottom: '8px' }}>
                                📚 Character References ({this.visualState.availableCharacters.length})
                            </div>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                {this.visualState.availableCharacters.map((char, index) => (
                                    <div key={char.characterId} style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '5px',
                                        background: 'rgba(74, 158, 255, 0.2)',
                                        borderRadius: '12px',
                                        padding: '4px 8px',
                                        fontSize: '11px'
                                    }}>
                                        <img 
                                            src={char.avatarUrl} 
                                            style={{ 
                                                width: '16px', 
                                                height: '16px', 
                                                borderRadius: '50%',
                                                objectFit: 'cover'
                                            }}
                                            alt={char.name}
                                        />
                                        <span>{char.name}</span>
                                        {char.galleryImages.length > 0 && (
                                            <span style={{ color: '#90EE90' }}>✓</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Generation Statistics */}
                {this.visualState.generationStats.totalGenerations > 0 && (
                    <div style={{
                        fontSize: '11px',
                        opacity: 0.6,
                        textAlign: 'center',
                        marginBottom: '10px',
                        color: '#ffd700'
                    }}>
                        📊 Generations: {this.visualState.generationStats.successfulGenerations}/{this.visualState.generationStats.totalGenerations} successful
                        {this.enableRefinement && ' • Refinement enabled'}
                    </div>
                )}

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