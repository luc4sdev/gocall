import { Track, type AudioProcessorOptions, type TrackProcessor } from 'livekit-client';

type AudioTrackProcessor = TrackProcessor<Track.Kind.Audio, AudioProcessorOptions>;

export class MicGainProcessor implements AudioTrackProcessor {
    name = 'gocall-mic-gain';
    processedTrack?: MediaStreamTrack;

    private gainValue: number;
    private readonly innerProcessor?: AudioTrackProcessor;
    private sourceNode?: MediaStreamAudioSourceNode;
    private gainNode?: GainNode;
    private destinationNode?: MediaStreamAudioDestinationNode;

    constructor(gainValue: number, innerProcessor?: AudioTrackProcessor) {
        this.gainValue = gainValue;
        this.innerProcessor = innerProcessor;
    }

    get hasDenoise() {
        return Boolean(this.innerProcessor);
    }

    async init(opts: AudioProcessorOptions) {
        let sourceTrack = opts.track;

        if (this.innerProcessor) {
            await this.innerProcessor.init(opts);
            if (this.innerProcessor.processedTrack) sourceTrack = this.innerProcessor.processedTrack;
        }

        this.sourceNode = opts.audioContext.createMediaStreamSource(new MediaStream([sourceTrack]));
        this.gainNode = opts.audioContext.createGain();
        this.gainNode.gain.value = this.gainValue;
        this.destinationNode = opts.audioContext.createMediaStreamDestination();
        this.sourceNode.connect(this.gainNode);
        this.gainNode.connect(this.destinationNode);
        this.processedTrack = this.destinationNode.stream.getAudioTracks()[0];
    }

    setGain(value: number) {
        this.gainValue = value;
        if (this.gainNode) this.gainNode.gain.value = value;
    }

    async restart(opts: AudioProcessorOptions) {
        await this.destroy();
        await this.init(opts);
    }

    async destroy() {
        this.sourceNode?.disconnect();
        this.gainNode?.disconnect();
        this.destinationNode?.disconnect();
        this.sourceNode = undefined;
        this.gainNode = undefined;
        this.destinationNode = undefined;
        if (this.innerProcessor) await this.innerProcessor.destroy().catch(() => { });
    }
}
