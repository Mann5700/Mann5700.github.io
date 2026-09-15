---
title: Bird Sound Generator
tagline: Adversarial audio synthesis
description: >-
  An end-to-end Generative Adversarial Network that synthesizes novel bird songs
  directly from raw audio waveforms — no spectrograms, just noise in and birdsong out.
featured: false
order: 3
year: 2023
status: shipped
theme: dust
technologies:
  - Python
  - TensorFlow
  - Keras
  - GANs
  - Librosa
  - NumPy
  - Matplotlib
problem: >-
  Generating convincing audio is harder than generating images: a waveform has no
  spatial structure to exploit, and small errors become audible immediately.
approach: >-
  Train a generator and discriminator against each other on real recordings of a single
  species, working directly on normalized raw waveforms, and verify improvement by
  listening rather than by loss curves alone.
architecture:
  - Librosa pipeline that loads recordings at 22 kHz, trims to fixed-length 5-second clips and normalizes waveforms to the [-1, 1] range.
  - Generator — dense 512 → 512 → 1024 → 1024 → audio length with ReLU, taking a 100-dimensional noise vector.
  - Discriminator — dense 1024 → 512 → 256 → 1 with ReLU and dropout, producing a real/fake probability.
  - Adversarial loop trained over 50 epochs with Adam, logging generator and discriminator loss separately.
  - Waveform plots and inline audio playback rendered periodically so progress is heard, not just measured.
decisions:
  - title: Raw waveforms over spectrograms
    detail: >-
      Working in the time domain removes the inverse-transform step entirely, at the
      cost of making the generator's job harder — a deliberate trade to keep the
      pipeline end-to-end.
  - title: Evaluate by ear
    detail: >-
      GAN losses are notoriously uninformative about sample quality, so the training
      loop renders playable audio and waveform plots at intervals and only saves the
      model once the output is audibly better.
links:
  github: https://github.com/Mann5700/Bird-Sound-Generator
---

A study in generative modelling where the output is judged by a sense other than sight.
The full implementation lives in a single notebook so the pipeline reads top to bottom:
load and normalize audio, define both networks, train adversarially, listen.

The obvious next steps are the ones the architecture points at — convolutional layers in
the style of WaveGAN for higher fidelity, spectrogram-domain training, and conditioning
on species label to generate more than one bird.
