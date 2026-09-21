/**
 * The honest notes shown under each demo: what the model really is, how it was
 * measured, and where it falls down.
 *
 * They live here, outside both skins, for the same reason the demo logic does:
 * a recruiter and a casual visitor must read exactly the same caveats. If this
 * text lived inside one skin's component, the two could quietly disagree, and
 * the caveats are the part that must never be quietly dropped.
 */
export type NoteTable = {
  caption: string
  head: string[]
  rows: string[][]
  /** Index of the row to highlight as the shipped result. */
  shipped?: number
}

export type Note = {
  label: string
  body: string
  /** true for limitations a reader must not miss; skins render these in a warning colour. */
  warn?: boolean
  table?: NoteTable
}

export const FRACTURE_NOTES: Note[] = [
  {
    label: 'Model',
    body: 'ResNet50 pretrained on ImageNet, with its last 30 layers fine-tuned on 30,015 concrete photos. Validation accuracy 96.9%. On 100 random test photos it got 92 right; Minor is the weakest class because it had about 10x fewer training images.',
  },
  {
    label: 'Severity labels',
    body: 'These were not written by engineers. They come from clustering image features into three tiers, so the boundary between Minor and Moderate is approximate.',
  },
  {
    label: 'Intensity, age and cause',
    body: 'Classical computer-vision heuristics — Canny edges, edge density and Hough line angles — not things the model learned. They are indicative only.',
  },
  {
    label: 'Not structural advice',
    body: 'Trained on bare concrete; painted walls, asphalt or odd lighting can fool it. For a real crack, ask a civil engineer.',
    warn: true,
  },
]

export const CORTEX_NOTES: Note[] = [
  {
    label: 'Grad-CAM',
    body: 'Takes the last convolutional block of the network, checks how much each of its feature maps would change the winning score, and adds the maps up with those weights. The result is a coarse map of the pixels that mattered, which is why the heat looks blocky rather than pixel-sharp.',
  },
  {
    label: 'The leakage story',
    body: 'The first version of this project scored about 99% — because the dataset was split by image. An MRI volume gives many slices per patient, so nearly every patient appeared in both the training and the test set, and the network could recognise the person instead of the disease. Splitting by patient instead, so nobody appears twice, tells the real story.',
    table: {
      caption: 'Same data, two ways of splitting it',
      head: ['Split', 'Classes', 'Test accuracy'],
      rows: [
        ['By image (leaky)', '4', '~99%'],
        ['By patient', '4', '28.7%'],
        ['By patient', '3 (this demo)', '60.2%'],
      ],
      shipped: 2,
    },
  },
  {
    label: 'Why three classes',
    body: 'The dataset has only 2 patients with Moderate Dementia. Split by patient, that class ends up with zero training images, so the demo refuses to predict it rather than pretending.',
  },
  {
    label: 'This model',
    body: 'Two networks vote — a ResNet18 retrained for this site and the older ResNet50, both trained on the same patient-level split. Together they score 60.2% accuracy and macro F1 0.59 on 693 held-out slices (alone: 58.0% / 0.565 and 58.2% / 0.550). The blend weight was chosen on the validation split, never on the test set. The heatmap comes from the ResNet18, because an explanation has to belong to one network to mean anything.',
  },
  {
    label: 'One slice is a hard question',
    body: 'A radiologist reads a whole scan, not a single slice. Letting every slice of a patient vote lifts accuracy from 58.0% to 81.5% across 54 held-out patients (macro F1 0.59 to 0.66). Worth knowing: 40 of those 54 are healthy, so always answering "Non Demented" would already score 74% — the voting model beats that on the rarer classes, which is where it counts. Switch to patient-series mode above to run it that way.',
  },
  {
    label: 'Tried and rejected',
    body: 'A 15-recipe training sweep on a GPU (ResNet18/34, EfficientNet-B0, two image sizes, light vs strong augmentation, class- vs patient-balanced sampling, and schedules from 1 to 8 epochs) produced a model slightly better per slice and slightly worse per patient — a tie within the noise of a 54-patient test set. Flip-averaging at prediction time made things worse. The search lives in scripts/train_cortex.py; the limit here is the number of patients, not the training.',
  },
  {
    label: 'Dataset',
    body: 'A balanced OASIS-derived MRI set: 1,500 images per class, 345 patients in total.',
  },
  {
    label: 'Not a diagnosis',
    body: 'Real dementia assessment uses clinical history, cognitive testing and a radiologist. This is a student research demo.',
    warn: true,
  },
]

export const LEXICON_NOTES: Note[] = [
  {
    label: 'How it reads a book',
    body: 'The file is parsed on the server — PyMuPDF for PDF, python-docx for DOCX, a zip reader for EPUB, plain text otherwise — and split into chapters by detecting headings, not by cutting at a fixed page count.',
  },
  {
    label: 'How it summarises',
    body: 'One chapter at a time is sent to Gemini, and the answer is streamed back as it is written, so text appears immediately instead of after a long silence.',
  },
  {
    label: 'Limits',
    body: 'A very long chapter is truncated to roughly 60,000 characters to fit the model. A document with no detectable headings comes back as a single chapter.',
  },
  {
    label: 'Your upload is not stored',
    body: 'Books are held in memory only and forgotten an hour after upload. Nothing a visitor uploads is written to disk.',
  },
]

export const ECHO_NOTES: Note[] = [
  {
    label: 'How it works',
    body: 'The recording is uploaded to Gemini, which listens to it and writes the minutes in a single call, answering in a fixed shape: summary, topics, decisions, owner-tagged action items and a speaker-labelled transcript.',
  },
  {
    label: 'Why a background job',
    body: 'Transcribing a long meeting takes longer than a browser will wait. The upload returns a job id immediately, the work carries on the server, and this page asks for that job’s status every couple of seconds until it is done.',
  },
  {
    label: 'Speaker labels are inferred',
    body: 'Speakers are separated by voice and numbered in the order they first talk. If someone says a name out loud, that name is used instead. There is no voice-print identification, so labels can be wrong.',
  },
  {
    label: 'Your recording is not stored',
    body: 'The file is deleted from Google when the job ends, and never touches this server’s disk.',
  },
]
