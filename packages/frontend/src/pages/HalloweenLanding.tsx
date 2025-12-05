import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Wand2, BookOpen, FlaskConical, Ghost, Users, Target, FileText, Clock } from 'lucide-react';
import { SpellCircle } from '../components/Halloween';

export const HalloweenLanding: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-950 text-white overflow-hidden">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center px-6 py-24">
        <div className="container mx-auto max-w-5xl text-center">
          {/* Spell Circle - Subtle */}
          <div className="flex justify-center mb-8">
            <SpellCircle className="w-24 h-24" />
          </div>

          {/* Main Heading */}
          <h1 className="font-display text-6xl md:text-7xl mb-6 text-primary-500">
            The Necromancer's Quill
          </h1>
          
          <p className="text-2xl md:text-3xl text-gray-300 mb-6 font-light">
            Resurrect AI text. Breathe life into the lifeless.
          </p>

          <p className="text-lg text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            AI detectors flag your content instantly. Our resurrection ritual transforms 
            machine-generated text into authentic human writing that passes every test.
          </p>

          {/* CTA Button */}
          <button
            onClick={() => navigate('/dashboard')}
            className="btn-resurrection text-lg px-10 py-5 inline-flex items-center gap-3"
          >
            <Wand2 className="w-5 h-5" />
            Begin Ritual
          </button>

          {/* Stats - Using icons instead of emojis */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-16 max-w-3xl mx-auto">
            <div className="stat-card text-center">
              <Users className="w-6 h-6 text-primary-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">10K+</div>
              <div className="text-sm text-gray-400">Souls Saved</div>
            </div>
            <div className="stat-card text-center">
              <Target className="w-6 h-6 text-accent-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">98%</div>
              <div className="text-sm text-gray-400">Evasion Rate</div>
            </div>
            <div className="stat-card text-center">
              <FileText className="w-6 h-6 text-warning-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">5M+</div>
              <div className="text-sm text-gray-400">Words Resurrected</div>
            </div>
            <div className="stat-card text-center">
              <Clock className="w-6 h-6 text-primary-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">24/7</div>
              <div className="text-sm text-gray-400">Always Available</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative py-20 px-6 bg-gray-900/30">
        <div className="container mx-auto max-w-5xl">
          <h2 className="text-3xl font-bold text-center mb-12 text-white">
            Features
          </h2>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Ghost Detector */}
            <div className="card-tombstone p-6">
              <Ghost className="w-8 h-8 text-accent-500 mb-4" />
              <h3 className="text-xl font-semibold mb-3 text-white">Ghost Detector</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Real-time AI detection scoring. Watch your curse level drop as text transforms.
              </p>
            </div>

            {/* Spell Book */}
            <div className="card-tombstone p-6">
              <BookOpen className="w-8 h-8 text-primary-500 mb-4" />
              <h3 className="text-xl font-semibold mb-3 text-white">Spell Book</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Pre-built templates for academic, business, creative, and casual writing styles.
              </p>
            </div>

            {/* Potion Lab */}
            <div className="card-tombstone p-6">
              <FlaskConical className="w-8 h-8 text-warning-500 mb-4" />
              <h3 className="text-xl font-semibold mb-3 text-white">Potion Lab</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                A/B test different approaches. Compare results side-by-side before committing.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="relative py-20 px-6">
        <div className="container mx-auto max-w-3xl">
          <h2 className="text-3xl font-bold text-center mb-12 text-white">
            How It Works
          </h2>

          <div className="space-y-8">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center text-gray-400 font-semibold">
                1
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-1 text-white">
                  Paste Your Text
                </h3>
                <p className="text-gray-400 text-sm">
                  Add AI-generated content to the ritual chamber. The ghost detector reveals the current curse level.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center text-gray-400 font-semibold">
                2
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-1 text-white">
                  Choose Intensity
                </h3>
                <p className="text-gray-400 text-sm">
                  Select your resurrection level: Light Touch, Medium Ritual, or Full Possession.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center text-gray-400 font-semibold">
                3
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-1 text-white">
                  Get Results
                </h3>
                <p className="text-gray-400 text-sm">
                  Your text transforms instantly. The ghost detector confirms detection evasion.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative py-16 px-6 bg-gray-900/30">
        <div className="container mx-auto max-w-3xl text-center">
          <h2 className="text-2xl font-bold mb-4 text-white">
            Ready to Resurrect Your Content?
          </h2>
          <p className="text-gray-400 mb-8">
            Join thousands who've brought their AI text back to life.
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="btn-resurrection text-lg px-8 py-4 inline-flex items-center gap-2"
          >
            <Wand2 className="w-5 h-5" />
            Enter the Resurrection Chamber
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative py-8 px-6 border-t border-gray-800">
        <div className="container mx-auto max-w-5xl text-center text-gray-500 text-sm">
          <p className="mb-2">
            Built with Kiro IDE for #Kiroween 2024
          </p>
          <p>
            © 2024 The Necromancer's Quill. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};
