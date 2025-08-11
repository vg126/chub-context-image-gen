# Visual Scene Composer - Complete Project Documentation

**Date:** 2025-08-11  
**Repository:** `/home/varaprad/cc-linux/stagey/`  
**Project Goal:** Transform stagey NLU Narrator into context-driven image generation system

## 🎯 **Project Vision**

Transform the existing stagey NLU Narrator Stage from a **text narrative generator** into a **Visual Scene Composer** that:

- **Context Absorption:** Analyzes recent conversation messages to understand current scene
- **Character Reference Integration:** Uses actual character profile images from Chub galleries
- **On-Demand Generation:** Creates visual snapshots only when user invokes (no monitoring)
- **Multi-API Support:** Works with both Chub Imagine API and Poe Flux models
- **Mars Subscription:** Unlimited generations (no cost constraints)

## 📁 **Repository Structure**

### **Main Stagey Repository**
```
/home/varaprad/cc-linux/stagey/
├── src/
│   ├── Stage.tsx              # Main stage implementation (NLU Narrator)
│   ├── TestRunner.tsx         # Development testing framework
│   └── main.tsx              # Entry point
├── public/
│   ├── chub_meta.yaml        # Stage configuration and metadata
│   ├── scenario.yaml         # Scenario configuration (mostly empty)
│   └── characters/
│       └── susan.yaml        # Example character definition
├── package.json              # Dependencies and project config
├── README.md                 # Stage template documentation
└── tsconfig.json            # TypeScript configuration
```

### **Related Documentation Files**
```
/home/varaprad/cc-linux/
├── Stages API format context image gen.md    # Chub API specifications
├── FaceAI_forandroid/
│   └── Chub Imagine API swagger.md          # Complete Imagine API docs
└── Session Logs August/                     # Previous session work
```

## 🏗️ **Current Implementation Analysis**

### **Existing NLU Narrator Stage** (`/src/Stage.tsx`)

**Current Capabilities:**
- **Text Generation:** Uses Poe API to generate campus narrative commentary
- **Conversation Hooks:** `beforePrompt()` and `afterResponse()` integration points
- **State Management:** Multi-layered state (init/chat/message levels)
- **React UI:** Toggle controls and narrative display
- **Configuration:** Poe API key, model selection, campus settings

**Key Architecture Elements:**
```typescript
export class Stage extends StageBase<InitStateType, ChatStateType, MessageStateType, ConfigType> {
    // State management
    narratorState: NarratorInternalState;
    
    // API integration
    private async generateNarrative(messageContent: string, isUserMessage: boolean): Promise<string>
    
    // Conversation hooks (PERFECT for image generation)
    async beforePrompt(userMessage: Message): Promise<Partial<StageResponse>>
    async afterResponse(botMessage: Message): Promise<Partial<StageResponse>>
    
    // UI rendering
    render(): ReactElement
}
```

## 🌐 **Chub API Specifications**

### **Critical Endpoints for Visual Scene Composer**

#### **1. Character Data Access**
```typescript
// Get character project data
GET /api/{namespace}/{creator_name}/{project_name}?full=false
// Returns: character info, avatar_url, max_res_url, hasGallery

// Get character gallery images  
GET /api/gallery/project/{project_id}?nsfw=true&page=1&limit=24
// Returns: character reference images with primary_image_path
```

**Example Response Structure:**
```json
{
  "node": {
    "id": 4365803,
    "name": "Maya Rajput",
    "avatar_url": "https://avatars.charhub.io/.../avatar.webp",
    "max_res_url": "https://avatars.charhub.io/.../chara_card_v2.png",
    "hasGallery": true
  }
}

// Gallery response
{
  "nodes": [{
    "primary_image_path": "https://avatars.charhub.io/.../gallery/image.jpeg",
    "primary_character_id": 4365803,
    "description": "Character in scene description"
  }]
}
```

#### **2. Chat Context Access**
```typescript
// Get chat tree and messages
GET /api/core/chats/v2/{chat_id}?include_messages=true&include_config=true

// Get specific message content
POST /api/core/chats/v2/{chat_id}/messages/content
// Body: { "ids": [message_ids] }
```

#### **3. Image Generation - Core Functionality**

**Text-to-Image (Basic):**
```typescript
POST /images/text2img
{
  "prompt": "scene description",
  "width": 1024,
  "height": 1024,
  "num_inference_steps": 50,
  "guidance_scale": 3.5,
  "chat_id": "string",
  "extension_source": "stage_id"
}
```

**Image-to-Image (PERFECT for character references):**
```typescript
POST /images/img2img
{
  "prompt": "scene with characters",
  "init_image": "https://character-reference-url",
  "type": "canny",
  "strength": 0.7,
  "width": 1024,
  "height": 1024,
  "chat_id": "string",
  "extension_source": "stage_id"
}
```

**Generation Monitoring:**
```typescript
POST /check
{
  "generation_uuid": "returned-from-generation",
  "request_type": "image"
}
```

**Response Format:**
```json
{
  "generation_uuid": "b9ae-6f64957f986a",
  "cost": 0,
  "queue_length": 0
}
```

## 🔧 **Technical Architecture for Visual Scene Composer**

### **Core Components**

#### **1. Context Absorption Engine**
```typescript
interface SceneContext {
  characters: CharacterReference[];
  location: string;
  actions: string;
  mood: string;
  timeOfDay: string;
}

private parseSceneContext(messages: Message[]): SceneContext {
  return {
    characters: this.extractActiveCharacters(messages),
    location: this.inferLocation(messages),
    actions: this.parseCurrentActions(messages),
    mood: this.analyzeMood(messages),
    timeOfDay: this.inferTiming(messages)
  };
}
```

#### **2. Character Reference System**
```typescript
interface CharacterReference {
  characterId: string;
  name: string;
  avatarUrl: string;
  galleryImages: string[];
  description: string;
}

private async fetchCharacterReferences(): Promise<CharacterReference[]> {
  // Access current chat participants
  // Extract character profile data from Chub
  // Cache reference images locally
}
```

#### **3. Multi-API Image Generation**
```typescript
interface ImageGenerationAPI {
  generateScene(context: SceneContext, characters: CharacterReference[]): Promise<string>;
}

class ChubImageAPI implements ImageGenerationAPI {
  async generateScene(context: SceneContext, characters: CharacterReference[]): Promise<string> {
    // Use /images/img2img with character references
    // Construct context-aware prompts
    // Return generated image URL
  }
}

class PoeFluxAPI implements ImageGenerationAPI {
  async generateScene(context: SceneContext, characters: CharacterReference[]): Promise<string> {
    // Convert to Poe Flux compatible format
    // Handle reference images as base64/URLs
  }
}
```

#### **4. Invocation System**
```typescript
// UI Integration
private generateSceneImage = async () => {
  this.setState({ generating: true });
  
  // Absorb last 3-5 messages for context
  const recentContext = this.getRecentMessages(5);
  const sceneContext = this.parseSceneContext(recentContext);
  const activeCharacters = await this.getActiveCharacters();
  
  const imageUrl = await this.imageGenerator.generateScene(sceneContext, activeCharacters);
  
  this.setState({ 
    generating: false, 
    lastGeneratedImage: imageUrl 
  });
}
```

### **Configuration Schema Updates**
```typescript
type ConfigType = {
  // API Selection
  image_api_provider: 'chub' | 'poe-flux';
  chub_api_key?: string;
  poe_api_key?: string;
  
  // Generation Settings
  image_quality: 'standard' | 'high';
  max_characters: number;
  scene_style: string;
  
  // Legacy narrator settings (maintain compatibility)
  narrator_model?: string;
  campus_name?: string;
  narrative_style?: string;
}
```

## 🎨 **UI Design Integration**

### **Updated Stage Interface**
```typescript
render(): ReactElement {
  return (
    <div style={{...existingStyles}}>
      {/* Existing narrator content */}
      
      <div style={{ marginTop: '20px', borderTop: '1px solid rgba(255,215,0,0.3)', paddingTop: '15px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <strong style={{ color: '#ffd700' }}>📸 Scene Capture</strong>
          <button
            onClick={this.generateSceneImage}
            disabled={this.state.generating}
            style={{
              background: this.state.generating ? '#666' : '#4a9eff',
              border: 'none',
              color: 'white',
              padding: '8px 16px',
              borderRadius: '15px',
              cursor: 'pointer'
            }}
          >
            {this.state.generating ? '⏳ Generating...' : '📸 Capture Scene'}
          </button>
        </div>
        
        {this.state.lastGeneratedImage && (
          <img 
            src={this.state.lastGeneratedImage} 
            style={{ width: '100%', borderRadius: '10px', marginTop: '10px' }}
            alt="Generated scene"
          />
        )}
      </div>
    </div>
  );
}
```

## 🛠️ **Implementation Strategy**

### **Phase 1: Foundation**
1. **Extend existing Stage.tsx** with image generation capabilities
2. **Add Chub API integration** alongside existing Poe integration
3. **Implement character reference fetching** from chat context
4. **Create basic UI controls** for image generation

### **Phase 2: Core Functionality**  
1. **Context parsing engine** for scene understanding
2. **Smart prompt construction** with character awareness
3. **img2img integration** with character references
4. **Progress monitoring** and error handling

### **Phase 3: Enhanced Features**
1. **Multi-character scene support** (2-4 characters)
2. **Location/mood intelligence** from conversation analysis
3. **Image gallery management** within stage
4. **Advanced scene composition** options

### **Phase 4: Optimization**
1. **Response caching** to avoid redundant generations
2. **Character image preprocessing** for better references
3. **Batch generation** capabilities
4. **Cross-platform performance** optimization

## 📋 **Technical Dependencies**

### **Existing Dependencies** (`package.json`)
```json
{
  "dependencies": {
    "@chub-ai/stages-ts": "^0.3.7",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "axios": "^1.6.0"
  }
}
```

### **Additional Requirements**
- **axios** ✅ (already included) - for API calls
- **@chub-ai/stages-ts** ✅ (already included) - stage framework
- **React hooks** - for state management
- **TypeScript interfaces** - for type safety

## 🔑 **User Context & Setup**

### **Environment**
- **Platform:** Linux (Arch)
- **Working Directory:** `/home/varaprad/cc-linux/stagey/`
- **Git Repository:** `vg126/stagey` (already cloned)
- **Subscription:** Mars (unlimited Chub generations)

### **Current Stage Status**
- **Stage Name:** NLU Universe Narrator  
- **Extension ID:** `nlu-narrator-stage-626ab7f374cf`
- **Visibility:** PUBLIC
- **GitHub Integration:** Active (auto-deploy on commits)

## 🚀 **Next Steps for Implementation**

### **Immediate Actions**
1. **Backup current Stage.tsx** before modifications
2. **Extend ConfigType** with image generation options
3. **Add CharacterReference interfaces** and types
4. **Implement fetchCharacterReferences()** method

### **API Integration Sequence**
1. **Character Gallery Access** → `/api/gallery/project/{project_id}`
2. **Chat Context Retrieval** → `/api/core/chats/v2/{chat_id}`
3. **Image Generation** → `/images/img2img` with references
4. **Progress Monitoring** → `/check` endpoint polling

### **Testing Strategy**
- **Use TestRunner.tsx** for development testing
- **Mock API responses** during development
- **Test with actual character data** from live chats
- **Validate image generation** with different scene types

## 🎯 **Success Criteria**

### **Core Functionality**
✅ **On-demand image generation** from conversation context  
✅ **Character likeness preservation** using profile references  
✅ **Multi-API support** (Chub + Poe Flux)  
✅ **Seamless stage integration** with existing UI  
✅ **Real-time progress feedback** during generation  

### **Advanced Features**
✅ **Multi-character scene composition**  
✅ **Intelligent scene understanding** from messages  
✅ **Location/mood awareness** in generated images  
✅ **Gallery management** within stage interface  

## 📚 **Key File References**

### **Primary Implementation**
- `/home/varaprad/cc-linux/stagey/src/Stage.tsx` - Main stage code
- `/home/varaprad/cc-linux/stagey/public/chub_meta.yaml` - Configuration schema

### **API Documentation** 
- `/home/varaprad/cc-linux/Stages API format context image gen.md` - Core API specs
- `/home/varaprad/cc-linux/FaceAI_forandroid/Chub Imagine API swagger.md` - Complete Imagine API

### **Related Projects**
- `/home/varaprad/cc-linux/FaceAI_forandroid/` - Face refinement system (reference)
- `/home/varaprad/cc-linux/codliveroil/` - Alternative face system implementation

### **Development Tools**
- `/home/varaprad/cc-linux/stagey/src/TestRunner.tsx` - Local testing framework
- `/home/varaprad/cc-linux/stagey/package.json` - Dependencies and scripts

---

## 💡 **Implementation Ready**

This documentation provides **complete context** for continuing the Visual Scene Composer implementation. The architecture is **fully specified**, API endpoints are **mapped and tested**, and the integration strategy is **implementation-ready**.

**Key Insight:** The existing `beforePrompt()`/`afterResponse()` hooks in Stage.tsx provide **perfect integration points** for context-driven image generation, making this transformation natural and seamless.

**Next Session Goal:** Begin implementing the character reference system and basic image generation integration using the Chub `/images/img2img` endpoint with actual character gallery images.