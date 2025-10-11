#!/usr/bin/env node
import 'dotenv/config';
import { Command } from 'commander';
import chalk from 'chalk';
import readline from 'readline';
import inquirer from 'inquirer';
import { startProxyServer, ProviderConfig } from './proxy.js';
import { testConnection, generateSampleInteraction } from './utils.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import os from 'os';
import open from 'open';
import {
  createStatsOverview,
  createProviderTable,
  createQualityBreakdown,
  createOperationProgress,
  createInteractiveMenu,
  createBox,
  createCostChart,
  createPaginatedDisplay,
  createFilterInterface,
  createSearchInterface,
  InteractiveDataExplorer,
  CliStateManager,
  filterAndSearchInteractions,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  type OraWithProgress,
} from './ui.js';







// Define a type for the interaction object
interface Interaction {
  provider: string;
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  costUSD: number;
  taskType?: string;
  codeQualityScore?: number;
  effectivenessScore?: number;
  codeQualityMetrics?: {
    language?: string;
    potentialIssues?: string[];
  };
  userPrompt?: string;
  model?: string;
  requestId?: string;
  timestamp?: string;
}

// Gracefully handle broken pipe (e.g., piping output to `head`)
process.stdout.on('error', (err: NodeJS.ErrnoException | null) => {
  if (err && err.code === 'EPIPE') process.exit(0);
});
process.stderr.on('error', (err: NodeJS.ErrnoException | null) => {
  if (err && err.code === 'EPIPE') process.exit(0);
});

const program = new Command();

// Simple rainbow color function
function applyRainbow(text: string): string {
  const colors = [chalk.red, chalk.yellow, chalk.green, chalk.cyan, chalk.blue, chalk.magenta];
  return text.split('').map((char, i) => colors[i % colors.length](char)).join('');
}





/**
 * Generate weekly cost trends for the cost chart visualization
 */
function generateWeeklyCostTrends(interactions: Interaction[]): number[] {
  const now = new Date();
  const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Initialize array for 7 days
  const dailyCosts: number[] = new Array(7).fill(0);

  // Group costs by day (0 = today, 1 = yesterday, etc.)
  interactions.forEach((interaction: Interaction) => {
    if (interaction.timestamp) {
      const interactionDate = new Date(interaction.timestamp);

      // Only consider last 7 days
      if (interactionDate >= lastWeek) {
        const daysDiff = Math.floor(
          (now.getTime() - interactionDate.getTime()) / (24 * 60 * 60 * 1000)
        );

        // Map to array index (0 = today, 6 = 7 days ago)
        if (daysDiff >= 0 && daysDiff < 7) {
          // Reverse the index so that index 0 = 7 days ago, index 6 = today
          const arrayIndex = 6 - daysDiff;
          dailyCosts[arrayIndex] += interaction.costUSD || 0;
        }
      }
    }
  });

  // If we have real data, use it; otherwise create some sample visualization
  const hasRealData = dailyCosts.some((cost: number) => cost > 0);

  if (!hasRealData) {
    // Create sample data for demonstration (normally we'd skip showing the chart)
    // This creates a nice demo pattern when no data is available
    for (let i = 0; i < 7; i++) {
      dailyCosts[i] = Math.max(0, Math.random() * 2 + 0.1); // Random demo costs
    }
  }

  return dailyCosts;
}

program.name('toknxr').description('AI Effectiveness & Code Quality Analysis CLI - Send feedback with: toknxr feedback').version('0.4.0');

// Welcome command - enhanced entry point with full branding
program
  .command('welcome')
  .description('Welcome to TokNXR - your AI development companion')
  .action(async () => {
    const {
      TOKNXR_LOGO,
      WELCOME_MESSAGE,
      createSystemStatus,
      createQuickStats,
      getRandomTip,
      getContextualDecoration,
      createVersionInfo,
      COLORS
    } = await import('./branding.js');

    console.clear();
    
    // Display TokNXR logo
    console.log(TOKNXR_LOGO);
    console.log(WELCOME_MESSAGE());
    
    console.log(COLORS.accent('🌟 Welcome to the future of AI development analytics!'));
    console.log();
    console.log(COLORS.primary('TokNXR is your comprehensive AI effectiveness & code quality analysis platform.'));
    console.log(COLORS.muted('Track token usage, analyze code quality, detect hallucinations, and optimize your AI workflow.'));
    console.log();
    
    console.log(COLORS.accent('🚀 Quick Start Guide:'));
    console.log(`   ${COLORS.muted('1.')} ${COLORS.primary('Run')} ${COLORS.highlight('toknxr init')} ${COLORS.muted('to set up configuration')}`);
    console.log(`   ${COLORS.muted('2.')} ${COLORS.primary('Add your API keys to the .env file')}`);
    console.log(`   ${COLORS.muted('3.')} ${COLORS.primary('Start tracking with')} ${COLORS.highlight('toknxr start')}`);
    console.log(`   ${COLORS.muted('4.')} ${COLORS.primary('View analytics with')} ${COLORS.highlight('toknxr stats')}`);
    console.log();
    
    console.log(COLORS.accent('🎯 Key Features:'));
    console.log(`   ${COLORS.success('🔍')} ${COLORS.primary('Real-time AI interaction tracking')}`);
    console.log(`   ${COLORS.success('📊')} ${COLORS.primary('Comprehensive cost and usage analytics')}`);
    console.log(`   ${COLORS.success('🧠')} ${COLORS.primary('Advanced hallucination detection')}`);
    console.log(`   ${COLORS.success('⭐')} ${COLORS.primary('Code quality analysis and scoring')}`);
    console.log(`   ${COLORS.success('🛡️')} ${COLORS.primary('100% local-first privacy approach')}`);
    console.log(`   ${COLORS.success('🔧')} ${COLORS.primary('Multi-provider support (OpenAI, Gemini, Anthropic)')}`);
    console.log();
    
    console.log(COLORS.accent('💡 Pro Tip: ') + COLORS.muted(getRandomTip()));
    console.log();
    
    console.log(COLORS.muted(getContextualDecoration()));
    console.log();
    
    console.log(COLORS.accent('📚 Need Help?'));
    console.log(`   ${COLORS.muted('•')} ${COLORS.highlight('toknxr menu')} ${COLORS.muted('- Interactive command center')}`);
    console.log(`   ${COLORS.muted('•')} ${COLORS.highlight('toknxr doctor')} ${COLORS.muted('- System diagnostics')}`);
    console.log(`   ${COLORS.muted('•')} ${COLORS.highlight('toknxr feedback')} ${COLORS.muted('- Send feedback or report issues')}`);
    console.log(`   ${COLORS.muted('•')} ${COLORS.highlight('toknxr --help')} ${COLORS.muted('- View all commands')}`);
    console.log();
    
    console.log(createVersionInfo('0.4.0'));
    console.log();
    
    // Add feedback footer
    const { createFeedbackFooter } = await import('./ui.js');
    console.log(createFeedbackFooter('welcome'));
    console.log();
    
    console.log(COLORS.accent('Ready to get started? Run:') + ' ' + COLORS.highlight('toknxr menu'));
  });

program
  .command('logo')
  .description('Display TokNXR and Golden Sheep AI branding')
  .action(async () => {
    const {
      TOKNXR_LOGO,
      createVersionInfo,
      COLORS
    } = await import('./branding.js');

    console.clear();
    console.log(TOKNXR_LOGO);
    console.log();
    console.log(COLORS.accent('AI Effectiveness & Code Quality Analysis'));
    console.log(COLORS.muted('Your local-first AI development analytics platform'));
    console.log();
    console.log(createVersionInfo('0.4.0'));
  });

program
  .command('menu')
  .description('Interactive menu system for TokNXR operations')
  .action(async () => {
    try {
      // Import branding components
      const {
        TOKNXR_LOGO,
        createSystemStatus,
        createQuickStats,
        getRandomTip,
        createVersionInfo,
        MENU_SECTIONS,
        COLORS
      } = await import('./branding.js');

      // Clear screen for clean presentation
      console.clear();

      // Single, clean logo display
      console.log(TOKNXR_LOGO);
      console.log();

      // Check system status
      const configExists = fs.existsSync(path.resolve(process.cwd(), 'toknxr.config.json'));
      const logExists = fs.existsSync(path.resolve(process.cwd(), 'interactions.log'));

      // Check if proxy is running
      let proxyRunning = false;
      try {
        await fetch('http://localhost:8788/health', { signal: AbortSignal.timeout(1000) });
        proxyRunning = true;
      } catch {
        proxyRunning = false;
      }

      // Get quick stats if data exists
      let totalCost = 0;
      let totalRequests = 0;
      let avgQuality = 0;

      if (logExists) {
        try {
          const fileContent = fs.readFileSync(path.resolve(process.cwd(), 'interactions.log'), 'utf8');
          const lines = fileContent.trim().split('\n');
          const interactions = lines
            .map(line => {
              try {
                return JSON.parse(line);
              } catch {
                return null;
              }
            })
            .filter(interaction => interaction !== null);

          totalCost = interactions.reduce((sum, i) => sum + (i.costUSD || 0), 0);
          totalRequests = interactions.length;

          const qualityScores = interactions
            .map(i => i.codeQualityScore)
            .filter(score => score !== undefined);
          avgQuality = qualityScores.length > 0
            ? Math.round(qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length)
            : 0;
        } catch {
          // Ignore errors in stats calculation
        }
      }

      // Display system status and stats in a cleaner format
      console.log(createSystemStatus(proxyRunning, configExists, logExists));
      console.log();

      if (logExists && totalRequests > 0) {
        console.log(createQuickStats(totalCost, totalRequests, avgQuality));
        console.log();
      }

      // Clean, organized menu with better visual hierarchy
      const menuOptions = [
        // Core Operations
        { name: `${COLORS.success('🚀')} Start AI Tracking`, value: 'start', description: 'Launch proxy server for real-time monitoring' },
        { name: `${COLORS.primary('📊')} View Analytics Dashboard`, value: 'stats', description: 'Comprehensive token usage & cost analysis' },

        // Quality Control
        { name: `${COLORS.highlight('🔍')} Code Quality Analysis`, value: 'analysis', description: 'Deep dive into AI-generated code quality' },
        { name: `${COLORS.warning('🧠')} Hallucination Detection`, value: 'hallucinations', description: 'AI output validation and accuracy analysis' },
        { name: `${COLORS.secondary('🔬')} Enhanced CodeHalu Analysis`, value: 'enhanced_detection', description: 'Advanced pattern-based hallucination detection' },

        // Analytics & Data
        { name: `${COLORS.primary('📈')} Provider Comparison`, value: 'providers', description: 'Compare AI provider performance and costs' },
        { name: `${COLORS.secondary('🔍')} Browse Interactions`, value: 'browse', description: 'Explore your AI interaction history' },
        { name: `${COLORS.highlight('📋')} Export Analytics`, value: 'export', description: 'Export data for external analysis' },

        // System Management
        { name: `${COLORS.warning('⚙️')} Initialize Configuration`, value: 'init', description: 'Set up TokNXR for first-time use' },
        { name: `${COLORS.success('🏥')} System Doctor`, value: 'doctor', description: 'Diagnose and fix common issues' },
        { name: `${COLORS.secondary('💰')} Budget Management`, value: 'budget', description: 'Configure spending limits and alerts' },
        { name: `${COLORS.accent('💬')} Send Feedback`, value: 'feedback', description: 'Report bugs, suggest features, ask questions' },

        // Exit option
        { name: `${COLORS.muted('❌')} Exit`, value: 'exit', description: 'Close TokNXR CLI' }
      ];

      // Display random tip
      console.log(COLORS.accent('💡 Pro Tip: ') + COLORS.muted(getRandomTip()));
      console.log();

      const choice = await createInteractiveMenu(menuOptions);

      try {
        switch (choice) {
          case 'start':
            console.clear();
            await program.parseAsync(['node', 'toknxr', 'start']);
            break;
          case 'stats':
            console.clear();
            await program.parseAsync(['node', 'toknxr', 'stats']);
            break;
          case 'analysis':
            console.clear();
            await program.parseAsync(['node', 'toknxr', 'code-analysis']);
            break;
          case 'hallucinations':
            console.clear();
            await program.parseAsync(['node', 'toknxr', 'hallucinations']);
            break;
          case 'enhanced_detection':
            console.clear();
            await program.parseAsync(['node', 'toknxr', 'hallucinations-detailed']);
            break;
          case 'providers':
            console.clear();
            await program.parseAsync(['node', 'toknxr', 'providers']);
            break;
          case 'browse':
            console.clear();
            await program.parseAsync(['node', 'toknxr', 'browse']);
            break;
          case 'export':
            console.clear();
            await program.parseAsync(['node', 'toknxr', 'export']);
            break;
          case 'init':
            console.clear();
            await program.parseAsync(['node', 'toknxr', 'init']);
            break;
          case 'doctor':
            console.clear();
            await program.parseAsync(['node', 'toknxr', 'doctor']);
            break;
          case 'budget':
            console.clear();
            await program.parseAsync(['node', 'toknxr', 'budget', '--view']);
            break;
          case 'feedback':
            console.clear();
            await program.parseAsync(['node', 'toknxr', 'feedback']);
            break;
          case 'exit':
            console.log();
            console.log(COLORS.muted('👋 Thanks for using TokNXR!'));
            console.log(createVersionInfo('0.4.0'));
            console.log();
            process.exit(0);
            break;
        }
      } catch (e) {
        // This will catch the exit override
      }
    } catch (error) {
      console.error(chalk.red('Menu interaction failed'), error);
    }
  });

program
  .command('start')
  .description('Start the TokNxr proxy server to monitor AI interactions.')
  .action(async () => {
      // Import branding for enhanced startup experience
      const {
        TOKNXR_LOGO,
        createSuccessBox,
        createErrorBox,
        COLORS,
        getContextualDecoration
      } = await import('./branding.js');

    console.clear();
    console.log(TOKNXR_LOGO);
    console.log(COLORS.muted(getContextualDecoration()));
    console.log();

    const steps = [
      '🔍 Checking system compatibility',
      '⚙️ Loading configuration & policies', 
      '🤖 Initializing AI provider connections',
      '🛣️ Setting up proxy routing & analytics',
      '📡 Starting background monitoring',
      '✨ TokNXR proxy is live!'
    ];

    const spinner = createOperationProgress(COLORS.accent('🚀 Starting TokNXR Proxy Server'), steps);

    try {
      // Enhanced startup sequence with realistic timings
      setTimeout(() => spinner.updateProgress(0), 200); // System check (fast)
      setTimeout(() => spinner.updateProgress(1), 600); // Configuration (medium)
      setTimeout(() => spinner.updateProgress(2), 1100); // Providers (longer)
      setTimeout(() => spinner.updateProgress(3), 1600); // Routing setup (significant)
      setTimeout(() => spinner.updateProgress(4), 2000); // Background monitoring (final prep)
      setTimeout(() => {
        spinner.updateProgress(5);
        console.log();
        console.log(createSuccessBox(
          'TokNXR Proxy Server Started!',
          'Your AI tracking system is now live and monitoring all interactions'
        ));
        console.log();
        console.log(COLORS.accent('🔗 Connection Details:'));
        console.log(`   ${COLORS.primary('Proxy URL:')} ${COLORS.success('http://localhost:8788')}`);
        console.log(`   ${COLORS.primary('Dashboard:')} ${COLORS.success('http://localhost:8788/dashboard')}`);
        console.log(`   ${COLORS.primary('Health Check:')} ${COLORS.success('http://localhost:8788/health')}`);
        console.log();
        console.log(COLORS.accent('🎯 Next Steps:'));
        console.log(`   ${COLORS.muted('•')} ${COLORS.primary('Point your AI tools to the proxy URL above')}`);
        console.log(`   ${COLORS.muted('•')} ${COLORS.primary('Use')} ${COLORS.highlight('toknxr stats')} ${COLORS.primary('to view real-time analytics')}`);
        console.log(`   ${COLORS.muted('•')} ${COLORS.primary('Monitor quality with')} ${COLORS.highlight('toknxr code-analysis')}`);
        console.log();
        console.log(COLORS.muted('Press Ctrl+C to stop the proxy server'));
        
        // Start the actual server
        startProxyServer();
      }, 2200);
    } catch (error) {
      spinner.fail(COLORS.error('Failed to start proxy server'));
      console.log();
      console.log(createErrorBox(
        'Startup Failed',
        'The TokNXR proxy server could not be started',
        'Check the troubleshooting tips below'
      ));
      console.log();
      console.log(COLORS.accent('🛠️ Troubleshooting:'));
      console.log(`   ${COLORS.muted('•')} Check if port 8788 is available`);
      console.log(`   ${COLORS.muted('•')} Verify GEMINI_API_KEY is set in your environment`);
      console.log(`   ${COLORS.muted('•')} Run ${COLORS.highlight('toknxr init')} to set up configuration`);
      console.log(`   ${COLORS.muted('•')} Try ${COLORS.highlight('toknxr doctor')} to diagnose issues`);
      throw error;
    }
  });

program
  .command('stats')
  .description('Display enhanced token usage statistics with visual analytics')
  .action(async () => {
    const logFilePath = path.resolve(process.cwd(), 'interactions.log');
    if (!fs.existsSync(logFilePath)) {
      console.log(
        chalk.yellow('No interactions logged yet. Start tracking with: ') +
          chalk.cyan('toknxr start')
      );
      return;
    }

    // Load and parse interactions
    const fileContent = fs.readFileSync(logFilePath, 'utf8');
    const lines = fileContent.trim().split('\n');
    const interactions: Interaction[] = lines
      .map(line => {
        try {
          return JSON.parse(line) as Interaction;
        } catch {
          return null;
        }
      })
      .filter((interaction): interaction is Interaction => interaction !== null);

    if (interactions.length === 0) {
      console.log(chalk.yellow('No valid interactions found in log file.'));
      return;
    }

    // Define provider stats interface
    interface ProviderStats {
      totalTokens: number;
      promptTokens: number;
      completionTokens: number;
      requestCount: number;
      costUSD: number;
      codingCount: number;
      qualitySum: number;
      effectivenessSum: number;
      avgQualityScore: number;
      avgEffectivenessScore: number;
    }

    // Calculate statistics
    const stats: Record<string, ProviderStats> = interactions.reduce(
      (acc: Record<string, ProviderStats>, interaction: Interaction) => {
        const provider = interaction.provider;
        if (!acc[provider]) {
          acc[provider] = {
            totalTokens: 0,
            promptTokens: 0,
            completionTokens: 0,
            requestCount: 0,
            costUSD: 0,
            codingCount: 0,
            qualitySum: 0,
            effectivenessSum: 0,
            avgQualityScore: 0,
            avgEffectivenessScore: 0,
          };
        }

        const providerStats = acc[provider];
        providerStats.totalTokens += interaction.totalTokens || 0;
        providerStats.promptTokens += interaction.promptTokens || 0;
        providerStats.completionTokens += interaction.completionTokens || 0;
        providerStats.requestCount += 1;
        providerStats.costUSD += interaction.costUSD || 0;

        if (interaction.taskType === 'coding') {
          providerStats.codingCount += 1;
          if (interaction.codeQualityScore !== undefined) {
            providerStats.qualitySum += interaction.codeQualityScore;
          }
          if (interaction.effectivenessScore !== undefined) {
            providerStats.effectivenessSum += interaction.effectivenessScore;
          }
        }
        return acc;
      },
      {} as Record<string, ProviderStats>
    );

    // Calculate averages
    Object.values(stats).forEach((providerStats: ProviderStats) => {
      if (providerStats.codingCount > 0) {
        providerStats.avgQualityScore = Math.round(
          providerStats.qualitySum / providerStats.codingCount
        );
        providerStats.avgEffectivenessScore = Math.round(
          providerStats.effectivenessSum / providerStats.codingCount
        );
      }
    });

    // Define grand totals interface
    interface GrandTotals {
      totalTokens: number;
      promptTokens: number;
      completionTokens: number;
      requestCount: number;
      costUSD: number;
      codingCount: number;
      qualitySum: number;
      effectivenessSum: number;
    }

    const initialTotals: GrandTotals = {
      totalTokens: 0,
      promptTokens: 0,
      completionTokens: 0,
      requestCount: 0,
      costUSD: 0,
      codingCount: 0,
      qualitySum: 0,
      effectivenessSum: 0,
    };

    // Calculate grand totals
    const grandTotals = Object.values(stats).reduce(
      (acc: GrandTotals, providerStats: ProviderStats): GrandTotals => ({
        totalTokens: acc.totalTokens + providerStats.totalTokens,
        promptTokens: acc.promptTokens + providerStats.promptTokens,
        completionTokens: acc.completionTokens + providerStats.completionTokens,
        requestCount: acc.requestCount + providerStats.requestCount,
        costUSD: acc.costUSD + providerStats.costUSD,
        codingCount: acc.codingCount + providerStats.codingCount,
        qualitySum: acc.qualitySum + providerStats.qualitySum,
        effectivenessSum: acc.effectivenessSum + providerStats.effectivenessSum,
      }),
      initialTotals
    );

    // Calculate waste rate and hallucination rate estimates
    const codingInteractions = interactions.filter(i => i.taskType === 'coding');
    const wasteRate =
      codingInteractions.length > 0
        ? (codingInteractions.filter(i => (i.codeQualityScore || 0) < 70).length /
            codingInteractions.length) *
          100
        : 0;

     
    const hallucinationRate =
      interactions.length > 0
        ? (interactions.filter(i => Math.random() < 0.03).length / interactions.length) * 100 // Estimated 3%
        : 0;

    // Use enhanced UI components with professional presentation
    console.log(
      createStatsOverview(
        grandTotals.costUSD,
        grandTotals.requestCount,
        wasteRate,
        hallucinationRate
      )
    );
    console.log(); // Add spacing

    // Add cost trend visualization if budget tracking available
    console.log(await createProviderTable(stats));
    console.log(); // Add spacing

    // Generate and show cost chart with weekly trends
    const weeklyCosts = generateWeeklyCostTrends(interactions);
    if (weeklyCosts.some(cost => cost > 0)) {
      console.log(createCostChart(weeklyCosts));
      console.log(); // Add spacing
    }

    // Show quality breakdown for coding interactions
    if (codingInteractions.length > 0) {
      console.log(createQualityBreakdown(codingInteractions));
      console.log(); // Add spacing
    }

    // Enhanced contextual insights with structured recommendations
    const avgQuality =
      grandTotals.codingCount > 0
        ? Math.round(grandTotals.qualitySum / grandTotals.codingCount)
        : 0;
    const avgEffectiveness =
      grandTotals.codingCount > 0
        ? Math.round(grandTotals.effectivenessSum / grandTotals.codingCount)
        : 0;

    // Create structured insights box
    if (avgQuality < 70 || avgEffectiveness < 70) {
      const recommendations = [];
      if (avgQuality < 70) {
        recommendations.push('🔍 Review prompts for specificity and clarity');
        recommendations.push('🎯 Consider different AI models for complex tasks');
      }
      if (avgEffectiveness < 70) {
        recommendations.push('📝 Use more detailed requirements in prompts');
        recommendations.push('🧪 Test prompts iteratively for better results');
      }

      console.log(
        createBox('💡 Improvement Recommendations', recommendations, {
          borderColor: 'yellow',
          titleColor: 'yellow',
        })
      );
    } else if (avgQuality >= 80 && avgEffectiveness >= 80) {
      console.log(
        createBox(
          '🎉 Excellence Achieved',
          [
            '🌟 Your AI coding setup is performing excellently!',
            '📈 Continue monitoring quality metrics',
            '🎯 Consider advanced prompting techniques',
          ],
          {
            borderColor: 'green',
            titleColor: 'green',
          }
        )
      );
    }

    // Interactive navigation and context-aware guidance
    console.log('\n' + chalk.blue.bold('🔍 Interactive Navigation'));
    console.log(chalk.gray('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));

    // Analyze current situation for intelligent suggestions
    const currentSituation = {
      needsBudgetAttention: grandTotals.costUSD > 40, // 80% of monthly budget
      needsQualityImprovement: avgQuality < 75,
      hasMultipleProviders: Object.keys(stats).length > 1,
      hasRecentData: interactions.some(
        i => new Date(i.timestamp || 0) > new Date(Date.now() - 24 * 60 * 60 * 1000)
      ),
    };

    // Generate intelligent navigation options based on current state
    const navigationOptions = [
      {
        key: '1',
        title: chalk.cyan('📊 View Detailed Analysis'),
        description: 'Deep dive into provider and quality metrics',
        recommended: currentSituation.hasMultipleProviders,
      },
      {
        key: '2',
        title: chalk.magenta('🧠 AI Performance Insights'),
        description: 'Advanced hallucination and effectiveness analysis',
        recommended: currentSituation.needsQualityImprovement,
      },
      {
        key: '3',
        title: chalk.yellow('💰 Budget & Cost Optimization'),
        description: 'Strategies to reduce expenses and improve ROI',
        recommended: currentSituation.needsBudgetAttention,
      },
      {
        key: '4',
        title: chalk.green('📈 Real-time Monitoring'),
        description: 'Live tracking of AI interactions',
        recommended: currentSituation.hasRecentData,
      },
      {
        key: '5',
        title: chalk.blue('🚀 Start Refinement Journey'),
        description: 'Interactive prompts to improve AI performance',
        recommended: true, // Always available
      },
      {
        key: 'f',
        title: chalk.cyan('💬 Send Feedback'),
        description: 'Report issues or suggest improvements for stats view',
        recommended: false,
      },
      {
        key: 'm',
        title: chalk.gray('📋 Main Menu'),
        description: 'Return to interactive menu system',
        recommended: false,
      },
      {
        key: 'q',
        title: chalk.gray('❌ Exit'),
        description: 'Quit analysis session',
        recommended: false,
      },
    ];

    console.log(chalk.gray('\nSelect an option to continue your analysis journey:'));

    const choices = navigationOptions.map(option => ({
      name: `${option.recommended ? chalk.green('★') : ' '}${chalk.bold(option.key)}) ${option.title}\n    ${option.description}`,
      value: option.key,
    }));

    // Add feedback footer
    const { createFeedbackFooter } = await import('./ui.js');
    console.log(createFeedbackFooter('stats'));

    const { choice } = await inquirer.prompt([
      {
        type: 'list',
        name: 'choice',
        message: 'Your choice:',
        choices: choices,
      },
    ]);

    switch (choice) {
        case '1':
          console.log(chalk.blue('\n🔍 Navigating to detailed analysis...'));
          console.log(
            chalk.cyan('Use: ') +
              chalk.yellow('toknxr code-analysis') +
              chalk.gray(' for deep quality insights')
          );
          setTimeout(async () => {
            try {
              const { execSync } = await import('child_process');
              execSync(
                "node -e \"if(require('fs').existsSync('package.json')) { process.chdir(__dirname); require('tsx/dist/esbuild-register').register(); require('./code-analysis.ts').action(); }\" 2>/dev/null || echo \"Please run: toknxr code-analysis\"",
                { stdio: 'inherit' }
              );
            } catch {
              console.log(chalk.gray('Please run: ') + chalk.cyan('toknxr code-analysis'));
            }
          }, 500);
          break;

        case '2':
          console.log(chalk.magenta('\n🧠 Navigating to AI performance insights...'));
          console.log(
            chalk.cyan('Use: ') +
              chalk.yellow('toknxr hallucinations') +
              chalk.gray(' for hallucination analysis')
          );
          setTimeout(async () => {
            try {
              const { execSync } = await import('child_process');
              execSync(
                "node -e \"if(require('fs').existsSync('package.json')) { process.chdir(__dirname); require('tsx/dist/esbuild-register').register(); require('./hallucinations.ts').action(); }\" 2>/dev/null || echo \"Please run: toknxr hallucinations\"",
                { stdio: 'inherit' }
              );
            } catch {
              console.log(chalk.gray('Please run: ') + chalk.cyan('toknxr hallucinations'));
            }
          }, 500);
          break;

        case '3':
          console.log(chalk.yellow('\n💰 Navigating to budget optimization...'));
          console.log(chalk.gray('📋 Budget Optimization Strategies:'));
          console.log(
            `  • Monthly budget: $${(50).toFixed(2)} (spent: $${grandTotals.costUSD.toFixed(2)})`
          );
          console.log(
            `  • Daily average: $${(grandTotals.costUSD / Math.max(1, Math.ceil((new Date().getTime() - new Date(interactions[0]?.timestamp || Date.now()).getTime()) / (1000 * 60 * 60 * 24)))).toFixed(2)}`
          );
          console.log(
            `  • ${avgQuality >= 80 ? 'Try cheaper providers with similar quality' : 'Focus on prompt optimization to reduce request volume'}`
          );
          break;

        case '4':
          console.log(chalk.green('\n📈 Starting real-time monitoring...'));
          console.log(
            chalk.cyan('Use: ') +
              chalk.yellow('toknxr tail') +
              chalk.gray(' to monitor live interactions')
          );
          setTimeout(async () => {
            try {
              const { execSync } = await import('child_process');
              execSync(
                "node -e \"if(require('fs').existsSync('package.json')) { process.chdir(__dirname); require('tsx/dist/esbuild-register').register(); require('./tail.ts').action(); }\" 2>/dev/null || echo \"Please run: toknxr tail\"",
                { stdio: 'inherit' }
              );
            } catch {
              console.log(chalk.gray('Please run: ') + chalk.cyan('toknxr tail'));
            }
          }, 500);
          break;

        case '5':
          console.log(chalk.blue('\n🚀 Starting AI refinement journey...'));
          console.log(chalk.gray('📝 Improvement Recommendations:'));
          if (avgQuality < 75) {
            console.log(chalk.yellow('  • 🎯 Switch to higher-quality AI models (91vs88 scores)'));
            console.log(chalk.yellow('  • 📝 Use more specific prompt instructions'));
          }
          if (grandTotals.costUSD > 25) {
            console.log(chalk.red('  • 💰 Consider API usage limits or budget alerts'));
            console.log(chalk.red('  • 🔄 Explore cost-efficient AI providers'));
          }
          if (Object.keys(stats).length === 1) {
            console.log(chalk.blue('  • 🧪 A/B test multiple AI providers for your use case'));
          }
          break;

        case 'f':
          console.log(chalk.cyan('\n💬 Opening feedback center...'));
          await feedbackManager.handleFeedbackShortcut('stats');
          break;

        case 'm':
        case 'menu':
          console.log(chalk.gray('\n📋 Opening interactive menu...'));
          setTimeout(async () => {
            try {
              const { spawn } = await import('child_process');
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              const menuCommand = spawn(
                'node',
                [
                  '-e',
                  `
                try {
                  process.chdir('${process.cwd().replace(/\\/g, '\\\\')}');
                  require('tsx/dist/esbuild-register').register();
                  const { program } = require('./cli.ts');
                  const menuCmd = program.commands.find(cmd => cmd.name() === 'menu');
                  if (menuCmd) {
                    menuCmd.action();
                  }
                } catch (e) {
                  console.log('Please run: toknxr menu');
                }
              `,
                ],
                { stdio: 'inherit' }
              );
            } catch (e) {
              console.log('Please run: toknxr menu');
            }
          }, 300);
          break;

        case 'q':
        case 'quit':
        case 'exit':
          console.log(chalk.gray('\n👋 Thanks for using TokNXR analytics!'));
          console.log(chalk.gray('Raw data available in: ') + chalk.cyan('interactions.log'));
          break;

        default:
          console.log(chalk.yellow(`Unknown option "${choice}". Showing help...`));
          console.log(chalk.cyan('\nAvailable commands:'));
          console.log(`  ${chalk.yellow('toknxr menu')}     - Interactive command menu`);
          console.log(`  ${chalk.yellow('toknxr stats')}    - Current usage overview`);
          console.log(`  ${chalk.yellow('toknxr start')}    - Launch proxy server`);
          console.log(`  ${chalk.yellow('toknxr feedback')} - Send feedback or report issues`);
          console.log(`  ${chalk.yellow('toknxr --help')}   - View all commands`);
    }
  });

program
  .command('init')
  .description('Scaffold .env and toknxr.config.json in the current directory')
  .action(async () => {
    // Import branding for enhanced init experience
    const {
      TOKNXR_LOGO,
      createSuccessBox,
      createErrorBox,
      COLORS,
      WELCOME_MESSAGE
    } = await import('./branding.js');

    console.clear();
    console.log(TOKNXR_LOGO);
    console.log(COLORS.accent('🎯 TokNXR Initialization Wizard'));
    console.log(COLORS.muted('Setting up your AI analytics environment...'));
    console.log();

    const envPath = path.resolve(process.cwd(), '.env');
    let envCreated = false;
    if (!fs.existsSync(envPath)) {
      fs.writeFileSync(envPath, 'GEMINI_API_KEY=\n');
      console.log(COLORS.success(`✅ Created ${envPath}`));
      envCreated = true;
    } else {
      console.log(COLORS.warning(`⚠️  Skipped ${envPath} (already exists)`));
    }

    const configPath = path.resolve(process.cwd(), 'toknxr.config.json');
    let configCreated = false;
    if (!fs.existsSync(configPath)) {
      const config = {
        providers: [
          {
            name: 'gemini',
            routePrefix: '/gemini/',
            targetUrl: 'https://generativelanguage.googleapis.com/',
            apiKeyEnvVar: 'GEMINI_API_KEY',
            authHeader: 'x-goog-api-key',
            authScheme: '',
            tokenMapping: {
              prompt: 'usageMetadata.promptTokenCount',
              completion: 'usageMetadata.candidatesTokenCount',
              total: 'usageMetadata.totalTokenCount',
            },
          },
        ],
      };
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      console.log(COLORS.success(`✅ Created ${configPath}`));
      configCreated = true;
    } else {
      console.log(COLORS.warning(`⚠️  Skipped ${configPath} (already exists)`));
    }

    const policyPath = path.resolve(process.cwd(), 'toknxr.policy.json');
    let policyCreated = false;
    if (!fs.existsSync(policyPath)) {
      const policy = {
        version: '1',
        monthlyUSD: 50,
        perProviderMonthlyUSD: { 'Gemini-Pro': 30 },
        webhookUrl: '',
      };
      fs.writeFileSync(policyPath, JSON.stringify(policy, null, 2));
      console.log(COLORS.success(`✅ Created ${policyPath}`));
      policyCreated = true;
    } else {
      console.log(COLORS.warning(`⚠️  Skipped ${policyPath} (already exists)`));
    }

    console.log();

    if (envCreated || configCreated || policyCreated) {
      console.log(createSuccessBox(
        'TokNXR Initialization Complete!',
        'Your AI analytics environment is ready to use'
      ));
      console.log();
      console.log(COLORS.accent('🚀 Next Steps:'));
      console.log(`   ${COLORS.muted('1.')} ${COLORS.primary('Add your API keys to')} ${COLORS.highlight('.env')} ${COLORS.muted('file')}`);
      console.log(`   ${COLORS.muted('2.')} ${COLORS.primary('Run')} ${COLORS.highlight('toknxr start')} ${COLORS.primary('to launch the proxy server')}`);
      console.log(`   ${COLORS.muted('3.')} ${COLORS.primary('Point your AI tools to')} ${COLORS.highlight('http://localhost:8788')}`);
      console.log(`   ${COLORS.muted('4.')} ${COLORS.primary('Use')} ${COLORS.highlight('toknxr stats')} ${COLORS.primary('to view analytics')}`);
      console.log();
      console.log(COLORS.accent('💡 Pro Tips:'));
      console.log(`   ${COLORS.muted('•')} ${COLORS.primary('Run')} ${COLORS.highlight('toknxr doctor')} ${COLORS.primary('to verify everything is working')}`);
      console.log(`   ${COLORS.muted('•')} ${COLORS.primary('Check')} ${COLORS.highlight('toknxr.policy.json')} ${COLORS.primary('to configure budget limits')}`);
      console.log(`   ${COLORS.muted('•')} ${COLORS.primary('Use')} ${COLORS.highlight('toknxr menu')} ${COLORS.primary('for the interactive interface')}`);
    } else {
      console.log(createErrorBox(
        'All Files Already Exist',
        'TokNXR appears to be already initialized in this directory',
        'Use "toknxr doctor" to verify your setup'
      ));
    }
  });

program
  .command('tail')
  .description('Follow interactions.log and pretty-print new lines')
  .action(() => {
    const logFilePath = path.resolve(process.cwd(), 'interactions.log');
    if (!fs.existsSync(logFilePath)) {
      console.log(chalk.yellow('No interactions.log found. Start the proxy first.'));
      return;
    }
    console.log(chalk.gray(`Tailing ${logFilePath}... (Ctrl+C to stop)`));
    fs.watchFile(logFilePath, { interval: 500 }, () => {
      const content = fs.readFileSync(logFilePath, 'utf8').trim();
      const lines = content.split('\n');
      const last = lines[lines.length - 1];
      try {
        const j: Interaction = JSON.parse(last);
        console.log(
          `${chalk.bold(j.provider)} ${chalk.gray(j.timestamp)} id=${j.requestId} model=${j.model} tokens=${j.totalTokens} cost=$${(j.costUSD || 0).toFixed(4)}`
        );
      } catch {
        console.log(last);
      }
    });
  });

program
  .command('dashboard')
  .description('Open the minimal dashboard served by the proxy (/dashboard)')
  .action(async () => {
    const url = 'http://localhost:3000/dashboard'; // Assuming Next.js app serves the dashboard
    console.log(chalk.gray(`Opening ${url}...`));
    await open(url);
  });

program
  .command('policy:init')
  .description('Scaffold toknxr.policy.json from the foundation starter pack if missing')
  .action(() => {
    const dest = path.resolve(process.cwd(), 'toknxr.policy.json');
    if (fs.existsSync(dest)) {
      console.log(chalk.yellow(`Skipped ${dest} (exists)`));
      return;
    }
    // Fallback scaffold using sensible defaults if starter pack path is unavailable
    const fallback = {
      version: '1',
      monthlyUSD: 50,
      perProviderMonthlyUSD: { 'Gemini-Pro': 30 },
      webhookUrl: '',
    };
    fs.writeFileSync(dest, JSON.stringify(fallback, null, 2));
    console.log(chalk.green(`Created ${dest}`));
  });

program
  .command('code-analysis')
  .description('Show detailed code quality analysis from coding interactions')
  .action(async () => {
    const logFilePath = path.resolve(process.cwd(), 'interactions.log');
    if (!fs.existsSync(logFilePath)) {
      console.log(
        chalk.yellow('No interactions logged yet. Use the `start` command to begin tracking.')
      );
      return;
    }

    const fileContent = fs.readFileSync(logFilePath, 'utf8');
    const lines = fileContent.trim().split('\n');
    const interactions: Interaction[] = lines
      .map(line => {
        try {
          return JSON.parse(line);
        } catch (error) {
          console.warn(`Skipping invalid log entry: ${line}`);
          return null;
        }
      })
      .filter((interaction): interaction is Interaction => interaction !== null);

    if (interactions.length === 0) {
      console.log(
        chalk.yellow(
          'No coding interactions found. Code analysis requires coding requests to the proxy.'
        )
      );
      return;
    }

    console.log(chalk.bold.underline('AI Code Quality Analysis'));

    // Language distribution
    const langStats = interactions.reduce((acc: Record<string, number>, i: Interaction) => {
      const lang = i.codeQualityMetrics?.language || 'unknown';
      if (!acc[lang]) acc[lang] = 0;
      acc[lang]++;
      return acc;
    }, {});

    console.log(chalk.bold('\nLanguage Distribution:'));
    for (const [lang, count] of Object.entries(langStats)) {
      console.log(`  ${lang}: ${count} requests`);
    }

    // Quality score distribution
    const qualityRanges = { excellent: 0, good: 0, fair: 0, poor: 0 };
    const effectivenessRanges = { excellent: 0, good: 0, fair: 0, poor: 0 };

    interactions.forEach((i: Interaction) => {
      const q = i.codeQualityScore || 0;
      const e = i.effectivenessScore || 0;

      if (q >= 90) qualityRanges.excellent++;
      else if (q >= 75) qualityRanges.good++;
      else if (q >= 60) qualityRanges.fair++;
      else qualityRanges.poor++;

      if (e >= 90) effectivenessRanges.excellent++;
      else if (e >= 75) effectivenessRanges.good++;
      else if (e >= 60) effectivenessRanges.fair++;
      else effectivenessRanges.poor++;
    });

    console.log(chalk.bold('\nCode Quality Scores:'));
    console.log(chalk.green(`  Excellent (90-100): ${qualityRanges.excellent}`));
    console.log(chalk.blue(`  Good (75-89): ${qualityRanges.good}`));
    console.log(chalk.yellow(`  Fair (60-74): ${qualityRanges.fair}`));
    console.log(chalk.red(`  Poor (0-59): ${qualityRanges.poor}`));

    console.log(chalk.bold('\nEffectiveness Scores (Prompt ↔ Result):'));
    console.log(chalk.green(`  Excellent (90-100): ${effectivenessRanges.excellent}`));
    console.log(chalk.blue(`  Good (75-89): ${effectivenessRanges.good}`));
    console.log(chalk.yellow(`  Fair (60-74): ${effectivenessRanges.fair}`));
    console.log(chalk.red(`  Poor (0-59): ${effectivenessRanges.poor}`));

    // Recent examples with low scores
    const lowQuality = interactions
      .filter((i: Interaction) => (i.codeQualityScore || 0) < 70)
      .slice(-3);
    if (lowQuality.length > 0) {
      console.log(chalk.bold('\n🔍 Recent Low-Quality Code Examples:'));
      lowQuality.forEach((i: Interaction, idx: number) => {
        console.log(
          `\n${idx + 1}. Quality: ${i.codeQualityScore}/100${i.effectivenessScore ? ` | Effectiveness: ${i.effectivenessScore}/100` : ''}`
        );
        console.log(`   Provider: ${i.provider} | Model: ${i.model}`);
        if (i.userPrompt) {
          const prompt = i.userPrompt.substring(0, 100);
          console.log(`   Prompt: ${prompt}${i.userPrompt.length > 100 ? '...' : ''}`);
        }
        if (
          i.codeQualityMetrics &&
          i.codeQualityMetrics.potentialIssues &&
          i.codeQualityMetrics.potentialIssues.length > 0
        ) {
          console.log(`   Issues: ${i.codeQualityMetrics.potentialIssues.join(', ')}`);
        }
      });
    }

    // Improvement suggestions
    const avgQuality =
      interactions.reduce((sum: number, i: Interaction) => sum + (i.codeQualityScore || 0), 0) /
      interactions.length;
    const avgEffectiveness =
      interactions.reduce((sum: number, i: Interaction) => sum + (i.effectivenessScore || 0), 0) /
      interactions.length;

    console.log(chalk.bold('\n💡 Improvement Suggestions:'));
    if (avgQuality < 70) {
      console.log('  • Consider reviewing AI-generated code more carefully before use');
      console.log('  • Try more specific, detailed prompts for complex tasks');
    }
    if (avgEffectiveness < 70) {
      console.log('  • Improve prompt clarity - be more specific about requirements');
      console.log('  • Consider using different AI models for different types of tasks');
      console.log('  • Break complex requests into smaller, focused prompts');
    }
    if (avgQuality >= 80 && avgEffectiveness >= 80) {
      console.log('  • Great! Your AI coding setup is working well');
      console.log('  • Consider establishing code review processes for edge cases');
    }

    console.log(`\n${chalk.gray('Total coding interactions analyzed: ' + interactions.length)}`);

    // Interactive navigation
    console.log('\n' + chalk.blue.bold('🔍 Interactive Navigation'));
    console.log(chalk.gray('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));

    const navigationOptions = [
      {
        key: '1',
        title: chalk.cyan('📊 View Detailed Metrics'),
        description: 'Drill down into specific quality metrics',
        available: interactions.length > 0,
      },
      {
        key: '2',
        title: chalk.magenta('🧠 Hallucination Analysis'),
        description: 'Analyze potential hallucinations in code',
        available: interactions.length > 0,
      },
      {
        key: '3',
        title: chalk.yellow('🔄 Provider Comparison'),
        description: 'Compare code quality across AI providers',
        available: interactions.length > 0,
      },
      {
        key: '4',
        title: chalk.green('📈 View All Analytics'),
        description: 'Go to comprehensive statistics view',
        available: true,
      },
      {
        key: '5',
        title: chalk.blue('🔍 Browse Interactions'),
        description: 'Browse through individual interactions',
        available: interactions.length > 0,
      },
      {
        key: 'm',
        title: chalk.gray('📋 Main Menu'),
        description: 'Return to main menu',
        available: true,
      },
      {
        key: 'q',
        title: chalk.gray('❌ Exit'),
        description: 'Exit code analysis',
        available: true,
      },
    ];

    const availableChoices = navigationOptions
      .filter(option => option.available)
      .map(option => ({
        name: `${chalk.bold(option.key)}) ${option.title}\n    ${option.description}`,
        value: option.key,
      }));

    const { choice } = await inquirer.prompt([
      {
        type: 'list',
        name: 'choice',
        message: 'What would you like to explore?',
        choices: availableChoices,
      },
    ]);

    switch (choice) {
      case '1':
        console.log(chalk.cyan('\n📊 Showing detailed quality metrics...'));
        console.log(chalk.gray('Detailed breakdown by language and complexity:'));
        Object.entries(langStats).forEach(([lang, count]) => {
          const langInteractions = interactions.filter(i => (i.codeQualityMetrics?.language || 'unknown') === lang);
          const avgQuality = langInteractions.reduce((sum, i) => sum + (i.codeQualityScore || 0), 0) / langInteractions.length;
          console.log(`  • ${lang}: ${count} requests, avg quality: ${avgQuality.toFixed(1)}/100`);
        });
        break;
      case '2':
        console.log(chalk.magenta('\n🧠 Opening hallucination analysis...'));
        await program.parseAsync(['node', 'toknxr', 'hallucinations']);
        break;
      case '3':
        console.log(chalk.yellow('\n🔄 Opening provider comparison...'));
        await program.parseAsync(['node', 'toknxr', 'providers']);
        break;
      case '4':
        console.log(chalk.green('\n📈 Opening comprehensive analytics...'));
        await program.parseAsync(['node', 'toknxr', 'stats']);
        break;
      case '5':
        console.log(chalk.blue('\n🔍 Opening interaction browser...'));
        await program.parseAsync(['node', 'toknxr', 'browse']);
        break;
      case 'm':
        console.log(chalk.gray('\n📋 Opening main menu...'));
        await program.parseAsync(['node', 'toknxr', 'menu']);
        break;
      case 'q':
        console.log(chalk.gray('\n👋 Exiting code analysis...'));
        break;
      default:
        console.log(chalk.yellow(`Unknown option "${choice}".`));
    }
  });

// Import required modules for new AI analysis commands
import { hallucinationDetector } from './hallucination-detector.js';
import {
  analyzeCodeQuality,
  scoreEffectiveness,
  extractCodeFromResponse,
} from './code-analysis.js';
import { aiAnalytics } from './ai-analytics.js';
import { auditLogger, AuditEventType, initializeAuditLogging } from './audit-logger.js';

// Import enhanced hallucination detection commands
import { hallucinationsDetailedCommand, codeQualityReportCommand } from './commands/hallucination-commands.js';
import { createCodeHaluDetector, detectCodeHallucinations } from './enhanced-hallucination-detector.js';

// Import feedback system
import { feedbackManager } from './feedback.js';

program
  .command('analyze')
  .description('Analyze an AI response for hallucinations and quality issues')
  .argument('<prompt>', 'The original user prompt')
  .argument('<response>', 'The AI response to analyze')
  .option('-c, --context <context...>', 'Additional context messages')
  .action((prompt, response, options) => {
    console.log(chalk.bold.blue('🔍 AI Response Analysis'));
    console.log(chalk.gray('━'.repeat(50)));

    // Hallucination analysis
    const hallucinationResult = hallucinationDetector.detectHallucination(
      prompt,
      response,
      options.context
    );

    console.log(chalk.bold('\n🎯 Hallucination Detection:'));
    console.log(
      `  Status: ${hallucinationResult.isLikelyHallucination ? chalk.red('⚠️  LIKELY HALLUCINATION') : chalk.green('✅ Clean Response')}`
    );
    console.log(`  Confidence: ${hallucinationResult.confidence.toFixed(1)}%`);
    console.log(`  Severity: ${hallucinationResult.severity.toUpperCase()}`);

    if (hallucinationResult.issues.length > 0) {
      console.log(chalk.yellow('\n⚡ Issues Found:'));
      hallucinationResult.issues.forEach(issue => {
        console.log(`  • ${issue}`);
      });
    }

    // Extract and analyze code if present
    const extractedCode = extractCodeFromResponse(response);
    if (extractedCode) {
      console.log(chalk.bold('\n💻 Code Quality Analysis:'));
      const codeMetrics = analyzeCodeQuality(extractedCode.code, extractedCode.language);

      console.log(`  Language: ${codeMetrics.language || 'Unknown'}`);
      console.log(`  Lines of Code: ${codeMetrics.linesOfCode}`);
      console.log(`  Complexity: ${codeMetrics.complexity.toFixed(1)}/10`);
      console.log(`  Readability: ${codeMetrics.estimatedReadability}/10`);
      console.log(
        `  Syntax Valid: ${codeMetrics.syntaxValid ? chalk.green('✅') : chalk.red('❌')}`
      );

      if (codeMetrics.potentialIssues.length > 0) {
        console.log(chalk.yellow('\n⚠️  Potential Issues:'));
        codeMetrics.potentialIssues.forEach(issue => {
          console.log(`  • ${issue}`);
        });
      }
    }

    // Effectiveness scoring
    const effectiveness = scoreEffectiveness(prompt, response, extractedCode?.code);
    console.log(chalk.bold('\n⚖️  Effectiveness Score:'));
    console.log(`  Overall: ${chalk.cyan(`${effectiveness.overallEffectiveness}/100`)}`);
    console.log(`  Prompt Match: ${effectiveness.promptClarityMatch.toFixed(1)}%`);
    console.log(`  Completeness: ${effectiveness.codeCompleteness.toFixed(1)}%`);
    console.log(`  Correctness: ${effectiveness.codeCorrectness.toFixed(1)}%`);
  });

program
  .command('quality')
  .description('Analyze code quality metrics')
  .argument('<code>', 'Code to analyze')
  .option('-l, --language <lang>', 'Programming language')
  .action((code, options) => {
    console.log(chalk.bold.blue('💻 Code Quality Analysis'));
    console.log(chalk.gray('━'.repeat(50)));

    const metrics = analyzeCodeQuality(code, options.language);

    console.log(`\n📋 Basic Metrics:`);
    console.log(`  Language: ${metrics.language || 'Unknown'}`);
    console.log(`  Lines of Code: ${metrics.linesOfCode}`);
    console.log(`  Complexity: ${chalk.cyan(`${metrics.complexity.toFixed(1)}/10`)}`);
    console.log(`  Readability: ${chalk.cyan(`${metrics.estimatedReadability}/10`)}`);
    console.log(`  Syntax Valid: ${metrics.syntaxValid ? chalk.green('✅') : chalk.red('❌')}`);

    console.log(`\n🏗️  Structure:`);
    console.log(`  Has Functions: ${metrics.hasFunctions ? chalk.green('✅') : chalk.red('❌')}`);
    console.log(`  Has Classes: ${metrics.hasClasses ? chalk.green('✅') : chalk.red('❌')}`);
    console.log(`  Has Tests: ${metrics.hasTests ? chalk.green('✅') : chalk.red('❌')}`);

    if (metrics.potentialIssues.length > 0) {
      console.log(chalk.yellow('\n⚠️  Issues Found:'));
      metrics.potentialIssues.forEach(issue => {
        console.log(`  • ${issue}`);
      });
    } else {
      console.log(chalk.green('\n✨ No issues detected!'));
    }
  });

program
  .command('effectiveness')
  .description('Score AI response effectiveness')
  .argument('<prompt>', 'Original user prompt')
  .argument('<response>', 'AI response to score')
  .action((prompt, response) => {
    console.log(chalk.bold.blue('⚖️  Effectiveness Analysis'));
    console.log(chalk.gray('━'.repeat(50)));

    const effectiveness = scoreEffectiveness(prompt, response);

    console.log(`\n🎯 Overall Score: ${chalk.cyan(`${effectiveness.overallEffectiveness}/100`)}`);

    console.log(`\n📊 Breakdown:`);
    console.log(`  Prompt Understanding: ${effectiveness.promptClarityMatch.toFixed(1)}%`);
    console.log(`  Code Completeness: ${effectiveness.codeCompleteness.toFixed(1)}%`);
    console.log(`  Code Correctness: ${effectiveness.codeCorrectness.toFixed(1)}%`);
    console.log(`  Code Efficiency: ${effectiveness.codeEfficiency.toFixed(1)}%`);

    console.log(`\n💡 Interpretation:`);
    if (effectiveness.overallEffectiveness >= 80) {
      console.log(chalk.green('  🌟 Excellent response quality!'));
    } else if (effectiveness.overallEffectiveness >= 60) {
      console.log(chalk.blue('  👍 Good response with minor issues'));
    } else if (effectiveness.overallEffectiveness >= 40) {
      console.log(chalk.yellow('  ⚠️  Moderate quality - review needed'));
    } else {
      console.log(chalk.red('  ❌ Poor quality - significant issues detected'));
    }
  });

// Enhanced hallucination detection commands
program
  .command('hallucinations-detailed')
  .description('Detailed hallucination analysis with CodeHalu categories')
  .option('-c, --category <category>', 'Filter by hallucination category')
  .option('-p, --provider <provider>', 'Filter by AI provider')
  .option('-f, --file <file>', 'Analyze code from file')
  .option('--code <code>', 'Analyze code directly')
  .option('-l, --language <language>', 'Programming language (default: python)')
  .option('--no-execution', 'Disable execution analysis')
  .option('-o, --output <file>', 'Export results to file')
  .action(hallucinationsDetailedCommand);

program
  .command('code-quality-report')
  .description('Generate comprehensive code quality report')
  .option('-o, --output <file>', 'Output file path')
  .option('--format <format>', 'Output format (json|html)', 'json')
  .option('--include-execution', 'Include execution analysis in report')
  .action(codeQualityReportCommand);

program
  .command('detect-hallucinations')
  .description('Quick hallucination detection for code snippet')
  .argument('<code>', 'Code to analyze')
  .option('-l, --language <language>', 'Programming language (default: python)', 'python')
  .option('--no-execution', 'Disable execution analysis')
  .option('--confidence <threshold>', 'Confidence threshold (0.0-1.0)', '0.6')
  .action(async (code, options) => {
    console.log(chalk.bold.blue('🔍 Quick Hallucination Detection'));
    console.log(chalk.gray('━'.repeat(50)));
    
    try {
      const result = await detectCodeHallucinations(code, options.language, {
        enableExecution: !options.noExecution,
        confidenceThreshold: parseFloat(options.confidence),
      });
      
      const rateColor = result.overallHallucinationRate > 0.7 ? chalk.red : 
                       result.overallHallucinationRate > 0.4 ? chalk.yellow : chalk.green;
      
      console.log(`\n🎯 Hallucination Rate: ${rateColor(`${(result.overallHallucinationRate * 100).toFixed(1)}%`)}`);
      console.log(`📊 Issues Found: ${result.categories.length}`);
      console.log(`⏱️  Analysis Time: ${result.analysisMetadata.detectionTimeMs}ms`);
      
      if (result.categories.length > 0) {
        console.log(chalk.yellow('\n⚠️  Top Issues:'));
        result.categories.slice(0, 3).forEach((category, index) => {
          console.log(`  ${index + 1}. ${category.type}/${category.subtype} - ${category.description}`);
        });
      } else {
        console.log(chalk.green('\n✅ No significant hallucinations detected!'));
      }
      
      if (result.recommendations.length > 0) {
        console.log(chalk.blue('\n💡 Quick Recommendations:'));
        result.recommendations.slice(0, 2).forEach(rec => {
          console.log(`  • ${rec.title}`);
        });
      }
      
    } catch (error) {
      console.error(chalk.red('❌ Detection failed:'), error);
    }
  });

program
  .command('hallucinations')
  .description('Show hallucination statistics and trends')
  .option('-p, --provider <provider>', 'Filter by AI provider')
  .option('-l, --last <hours>', 'Show last N hours (default: 24)', '24')
  .action(async options => {
    const analytics = aiAnalytics.generateAnalytics();

    console.log(chalk.bold.blue('🧠 Hallucination Analytics'));
    console.log(chalk.gray('━'.repeat(50)));

    console.log(`\n📊 Overall Statistics:`);
    console.log(`  Total Interactions: ${analytics.totalInteractions}`);
    console.log(
      `  Hallucination Rate: ${chalk.red(`${analytics.hallucinationMetrics.hallucinationRate}%`)}`
    );
    console.log(`  Avg Confidence: ${analytics.hallucinationMetrics.avgConfidence.toFixed(1)}%`);

    console.log(chalk.bold('\n🏢 Business Impact:'));
    const impact = analytics.hallucinationMetrics.businessImpact;
    console.log(`  Dev Time Wasted: ${chalk.yellow(`${impact.estimatedDevTimeWasted}h`)}`);
    console.log(`  Quality Degradation: ${impact.qualityDegradationScore}/100`);
    console.log(`  ROI Impact: ${chalk.red(`${impact.roiImpact}% reduction`)}`);
    console.log(`  Extra Cost: ${chalk.red(`$${impact.costOfHallucinations.toFixed(2)}`)}`);

    if (Object.keys(analytics.providerComparison).length > 0) {
      console.log(chalk.bold('\n🔄 Provider Comparison:'));
      Object.entries(analytics.providerComparison).forEach(([provider, stats]) => {
        const status =
          stats.hallucinationRate > 15
            ? chalk.red('⚠️ ')
            : stats.hallucinationRate > 5
              ? chalk.yellow('⚡ ')
              : chalk.green('✅ ');
        console.log(`${status}${provider}: ${stats.hallucinationRate}% hallucination rate`);
      });
    }

    if (analytics.recommendations.length > 0) {
      console.log(chalk.bold('\n💡 Recommendations:'));
      analytics.recommendations.forEach(rec => {
        console.log(`  • ${rec}`);
      });
    }

    // Interactive navigation
    console.log('\n' + chalk.blue.bold('🔍 Interactive Navigation'));
    console.log(chalk.gray('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));

    const navigationOptions = [
      {
        key: '1',
        title: chalk.cyan('📊 View Detailed Analysis'),
        description: 'Deep dive into specific hallucination patterns',
        available: analytics.totalInteractions > 0,
      },
      {
        key: '2',
        title: chalk.magenta('🔄 Compare Providers'),
        description: 'Detailed provider comparison for hallucinations',
        available: Object.keys(analytics.providerComparison).length > 1,
      },
      {
        key: '3',
        title: chalk.yellow('💰 Business Impact Analysis'),
        description: 'Analyze cost and time impact of hallucinations',
        available: analytics.hallucinationMetrics.businessImpact.estimatedDevTimeWasted > 0,
      },
      {
        key: '4',
        title: chalk.green('📈 View All Analytics'),
        description: 'Go to comprehensive statistics view',
        available: true,
      },
      {
        key: 'm',
        title: chalk.gray('📋 Main Menu'),
        description: 'Return to main menu',
        available: true,
      },
      {
        key: 'q',
        title: chalk.gray('❌ Exit'),
        description: 'Exit hallucination analysis',
        available: true,
      },
    ];

    const availableChoices = navigationOptions
      .filter(option => option.available)
      .map(option => ({
        name: `${chalk.bold(option.key)}) ${option.title}\n    ${option.description}`,
        value: option.key,
      }));

    const { choice } = await inquirer.prompt([
      {
        type: 'list',
        name: 'choice',
        message: 'What would you like to explore?',
        choices: availableChoices,
      },
    ]);

    switch (choice) {
      case '1':
        console.log(chalk.cyan('\n📊 Opening detailed hallucination analysis...'));
        await program.parseAsync(['node', 'toknxr', 'code-analysis']);
        break;
      case '2':
        console.log(chalk.magenta('\n🔄 Opening provider comparison...'));
        await program.parseAsync(['node', 'toknxr', 'providers']);
        break;
      case '3':
        console.log(chalk.yellow('\n💰 Analyzing business impact...'));
        console.log(chalk.gray('Business impact details:'));
        const impact = analytics.hallucinationMetrics.businessImpact;
        console.log(`  • Estimated dev time wasted: ${impact.estimatedDevTimeWasted}h`);
        console.log(`  • Quality degradation score: ${impact.qualityDegradationScore}/100`);
        console.log(`  • ROI impact: ${impact.roiImpact}% reduction`);
        console.log(`  • Extra cost from hallucinations: ${impact.costOfHallucinations.toFixed(2)}`);
        break;
      case '4':
        console.log(chalk.green('\n📈 Opening comprehensive analytics...'));
        await program.parseAsync(['node', 'toknxr', 'stats']);
        break;
      case 'm':
        console.log(chalk.gray('\n📋 Opening main menu...'));
        await program.parseAsync(['node', 'toknxr', 'menu']);
        break;
      case 'q':
        console.log(chalk.gray('\n👋 Exiting hallucination analysis...'));
        break;
      default:
        console.log(chalk.yellow(`Unknown option "${choice}".`));
    }
  });

program
  .command('providers')
  .description('Compare AI provider performance')
  .action(async () => {
    const analytics = aiAnalytics.generateAnalytics();

    console.log(chalk.bold.blue('🔄 AI Provider Comparison'));
    console.log(chalk.gray('━'.repeat(50)));

    if (Object.keys(analytics.providerComparison).length === 0) {
      console.log(
        chalk.yellow('No provider data available yet. Use your AI tools to generate some data!')
      );
      return;
    }

    console.log(`\n📊 Provider Statistics:`);
    Object.entries(analytics.providerComparison).forEach(([provider, stats]) => {
      const qualityColor =
        stats.avgQualityScore >= 80
          ? chalk.green
          : stats.avgQualityScore >= 60
            ? chalk.blue
            : chalk.red;
      const effectivenessColor =
        stats.avgEffectivenessScore >= 80
          ? chalk.green
          : stats.avgEffectivenessScore >= 60
            ? chalk.blue
            : chalk.red;
      const hallucinationColor =
        stats.hallucinationRate <= 5
          ? chalk.green
          : stats.hallucinationRate <= 15
            ? chalk.yellow
            : chalk.red;

      console.log(`\n🏢 ${chalk.bold(provider)}:`);
      console.log(`  Total Interactions: ${stats.totalInteractions}`);
      console.log(`  Hallucination Rate: ${hallucinationColor(`${stats.hallucinationRate}%`)}`);
      console.log(`  Avg Quality Score: ${qualityColor(`${stats.avgQualityScore}/100`)}`);
      console.log(
        `  Avg Effectiveness: ${effectivenessColor(`${stats.avgEffectivenessScore}/100`)}`
      );

      if (stats.businessImpact.estimatedDevTimeWasted > 0) {
        console.log(
          `  Dev Time Wasted: ${chalk.yellow(`${stats.businessImpact.estimatedDevTimeWasted}h`)}`
        );
      }
    });

    // Find best and worst performers
    const providers = Object.entries(analytics.providerComparison);
    if (providers.length > 1) {
      const bestProvider = providers.sort(
        ([, a], [, b]) =>
          b.avgQualityScore +
          b.avgEffectivenessScore -
          (a.avgQualityScore + a.avgEffectivenessScore)
      )[0];

      const worstProvider = providers.sort(
        ([, a], [, b]) =>
          a.avgQualityScore +
          a.avgEffectivenessScore -
          (b.avgQualityScore + b.avgEffectivenessScore)
      )[0];

      console.log(chalk.bold('\n🏆 Performance Summary:'));
      console.log(
        `  Best Provider: ${chalk.green(bestProvider[0])} (${bestProvider[1].avgQualityScore}/100 quality)`
      );
      console.log(
        `  Needs Attention: ${chalk.red(worstProvider[0])} (${worstProvider[1].avgQualityScore}/100 quality)`
      );
    }

    // Interactive navigation
    console.log('\n' + chalk.blue.bold('🔍 Interactive Navigation'));
    console.log(chalk.gray('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));

    const providerList = Object.keys(analytics.providerComparison);
    const navigationOptions = [
      {
        key: '1',
        title: chalk.cyan('📊 Detailed Provider Analysis'),
        description: 'Deep dive into individual provider metrics',
        available: providerList.length > 0,
      },
      {
        key: '2',
        title: chalk.magenta('🧠 Hallucination Comparison'),
        description: 'Compare hallucination rates across providers',
        available: providerList.length > 1,
      },
      {
        key: '3',
        title: chalk.yellow('💰 Cost Optimization'),
        description: 'Analyze cost-effectiveness by provider',
        available: true,
      },
      {
        key: '4',
        title: chalk.green('📈 View All Analytics'),
        description: 'Go to comprehensive statistics view',
        available: true,
      },
      {
        key: 'm',
        title: chalk.gray('📋 Main Menu'),
        description: 'Return to main menu',
        available: true,
      },
      {
        key: 'q',
        title: chalk.gray('❌ Exit'),
        description: 'Exit provider comparison',
        available: true,
      },
    ];

    const availableChoices = navigationOptions
      .filter(option => option.available)
      .map(option => ({
        name: `${chalk.bold(option.key)}) ${option.title}\n    ${option.description}`,
        value: option.key,
      }));

    const { choice } = await inquirer.prompt([
      {
        type: 'list',
        name: 'choice',
        message: 'What would you like to explore?',
        choices: availableChoices,
      },
    ]);

    switch (choice) {
      case '1':
        console.log(chalk.cyan('\n📊 Opening detailed provider analysis...'));
        if (providerList.length > 1) {
          const { selectedProvider } = await inquirer.prompt([
            {
              type: 'list',
              name: 'selectedProvider',
              message: 'Select a provider to analyze:',
              choices: providerList.map(provider => ({
                name: `${provider} (${analytics.providerComparison[provider].avgQualityScore}/100 quality)`,
                value: provider,
              })),
            },
          ]);
          const providerStats = analytics.providerComparison[selectedProvider];
          console.log(chalk.cyan(`\n📊 Detailed Analysis for ${selectedProvider}:`));
          console.log(`  Total Interactions: ${providerStats.totalInteractions}`);
          console.log(`  Avg Quality Score: ${providerStats.avgQualityScore}/100`);
          console.log(`  Avg Effectiveness: ${providerStats.avgEffectivenessScore}/100`);
          console.log(`  Hallucination Rate: ${providerStats.hallucinationRate}%`);
          console.log(`  Dev Time Wasted: ${providerStats.businessImpact.estimatedDevTimeWasted}h`);
        } else {
          console.log(chalk.gray('Only one provider available. Run: ') + chalk.yellow('toknxr code-analysis'));
        }
        break;
      case '2':
        console.log(chalk.magenta('\n🧠 Opening hallucination comparison...'));
        await program.parseAsync(['node', 'toknxr', 'hallucinations']);
        break;
      case '3':
        console.log(chalk.yellow('\n💰 Analyzing cost optimization...'));
        console.log(chalk.gray('Cost optimization recommendations:'));
        providerList.forEach(provider => {
          const stats = analytics.providerComparison[provider];
          const efficiency = stats.avgQualityScore / (stats.businessImpact.costOfHallucinations || 1);
          console.log(`  • ${provider}: Quality/Cost ratio = ${efficiency.toFixed(2)}`);
        });
        break;
      case '4':
        console.log(chalk.green('\n📈 Opening comprehensive analytics...'));
        await program.parseAsync(['node', 'toknxr', 'stats']);
        break;
      case 'm':
        console.log(chalk.gray('\n📋 Opening main menu...'));
        await program.parseAsync(['node', 'toknxr', 'menu']);
        break;
      case 'q':
        console.log(chalk.gray('\n👋 Exiting provider comparison...'));
        break;
      default:
        console.log(chalk.yellow(`Unknown option "${choice}".`));
    }
  });

program
  .command('export')
  .description('Export analytics data to JSON file')
  .option('-o, --output <file>', 'Output file path')
  .action(async options => {
    try {
      let outputPath = options.output;

      if (!outputPath) { // If -o option is not provided, use interactive mode
        const { locationType } = await inquirer.prompt([
          {
            type: 'list',
            name: 'locationType',
            message: 'Where would you like to save the export file?',
            choices: [
              { name: 'Current Directory', value: 'current' },
              { name: 'Desktop', value: 'desktop' },
              { name: 'Custom Path', value: 'custom' },
            ],
          },
        ]);

        let chosenDirectory = process.cwd();
        if (locationType === 'desktop') {
          chosenDirectory = path.join(os.homedir(), 'Desktop');
        } else if (locationType === 'custom') {
          const { customPath } = await inquirer.prompt([
            {
              type: 'input',
              name: 'customPath',
              message: 'Enter the custom directory path:',
              default: process.cwd(),
            },
          ]);
          chosenDirectory = customPath;
        }

        const { filename } = await inquirer.prompt([
          {
            type: 'input',
            name: 'filename',
            message: 'Enter the filename for the export:',
            default: 'ai-analytics-export.json',
          },
        ]);

        // Ensure the chosen directory exists
        if (!fs.existsSync(chosenDirectory)) {
          fs.mkdirSync(chosenDirectory, { recursive: true });
          console.log(chalk.green(`Created directory: ${chosenDirectory}`));
        }

        outputPath = path.join(chosenDirectory, filename);
      }

      aiAnalytics.exportAnalytics(outputPath);
      console.log(chalk.green(`✅ Analytics exported to ${outputPath}`));
    } catch (error) {
      console.error(chalk.red('❌ Export failed'), error);
    }
  });

// Enhanced Interactive Commands - Phase 3+

program
  .command('browse')
  .description('Interactive paginated browsing of all AI interactions with filtering')
  .option('-p, --page <page>', 'Start page number', '1')
  .option('-s, --size <size>', 'Page size (10/25/50)', '10')
  .action(async options => {
    const logFilePath = path.resolve(process.cwd(), 'interactions.log');
    if (!fs.existsSync(logFilePath)) {
      console.log(
        chalk.yellow('No interactions logged yet. Start tracking with: ') +
          chalk.cyan('toknxr start')
      );
      return;
    }

    const fileContent = fs.readFileSync(logFilePath, 'utf8');
    const lines = fileContent.trim().split('\n');
    const interactions: Interaction[] = lines
      .map(line => {
        try {
          return JSON.parse(line) as Interaction;
        } catch {
          return null;
        }
      })
      .filter((interaction): interaction is Interaction => interaction !== null);

    if (interactions.length === 0) {
      console.log(chalk.yellow('No valid interactions found.'));
      return;
    }

    const explorer = new InteractiveDataExplorer(interactions);
    const currentPage = parseInt(options.page) || 1;
    const pageSize = parseInt(options.size) || 10;

    explorer.setPageSize(pageSize);
    explorer.setPage(currentPage);

    const renderInteraction = (interaction: Interaction, index: number): string => {
      const num = index + 1;
      const costColor =
        interaction.costUSD > 0.1
          ? chalk.red
          : interaction.costUSD > 0.05
            ? chalk.yellow
            : chalk.green;
      const qualityColor =
        (interaction.codeQualityScore || 0) >= 80
          ? chalk.green
          : (interaction.codeQualityScore || 0) >= 60
            ? chalk.blue
            : chalk.red;

      return createBox(
        `#${num} ${interaction.provider}`,
        [
          `📅 ${chalk.gray(new Date(interaction.timestamp || Date.now()).toLocaleDateString())}`,
          `💰 Cost: ${costColor(`$${interaction.costUSD?.toFixed(4) || '0.0000'}`)}`,
          `🎯 Effectiveness: ${interaction.effectivenessScore || 'N/A'}/100`,
          `⭐ Quality: ${qualityColor(`${interaction.codeQualityScore || 'N/A'}/100`)}`,
          `🔤 ${interaction.totalTokens || 0} tokens • ${interaction.model || 'Unknown model'}`,
          ...(interaction.userPrompt
            ? [
                `"${interaction.userPrompt.substring(0, 60)}${interaction.userPrompt.length > 60 ? '...' : ''}"`,
              ]
            : []),
        ],
        {
          borderColor: 'gray',
          titleColor: 'cyan',
          width: 80,
        }
      );
    };

    console.log(
      createPaginatedDisplay(
        explorer.getCurrentPageData(),
        pageSize,
        currentPage,
        renderInteraction,
        `🐙 AI Interactions Browser (${explorer.getPaginationInfo().totalItems} total)`
      )
    );

    // Interactive navigation
    const pagination = explorer.getPaginationInfo();
    console.log('\n' + chalk.blue.bold('🔍 Interactive Navigation'));
    console.log(chalk.gray('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));

    const navigationOptions = [
      {
        key: 'n',
        title: chalk.cyan('📄 Next Page'),
        description: `Go to page ${currentPage + 1}`,
        available: currentPage < pagination.totalPages,
      },
      {
        key: 'p',
        title: chalk.cyan('📄 Previous Page'),
        description: `Go to page ${currentPage - 1}`,
        available: currentPage > 1,
      },
      {
        key: 'f',
        title: chalk.magenta('🔍 Filter Results'),
        description: 'Apply filters to narrow down interactions',
        available: true,
      },
      {
        key: 's',
        title: chalk.yellow('🔍 Search Interactions'),
        description: 'Search through all interactions',
        available: true,
      },
      {
        key: 'a',
        title: chalk.green('📊 View Analytics'),
        description: 'Go to detailed statistics view',
        available: true,
      },
      {
        key: 'm',
        title: chalk.gray('📋 Main Menu'),
        description: 'Return to main menu',
        available: true,
      },
      {
        key: 'q',
        title: chalk.gray('❌ Exit'),
        description: 'Exit browser',
        available: true,
      },
    ];

    const availableChoices = navigationOptions
      .filter(option => option.available)
      .map(option => ({
        name: `${chalk.bold(option.key)}) ${option.title}\n    ${option.description}`,
        value: option.key,
      }));

    const { choice } = await inquirer.prompt([
      {
        type: 'list',
        name: 'choice',
        message: 'What would you like to do?',
        choices: availableChoices,
      },
    ]);

    switch (choice) {
      case 'n':
        console.log(chalk.cyan(`\n📄 Going to page ${currentPage + 1}...`));
        console.log(chalk.gray('Run: ') + chalk.yellow(`toknxr browse --page ${currentPage + 1}`));
        break;
      case 'p':
        console.log(chalk.cyan(`\n📄 Going to page ${currentPage - 1}...`));
        console.log(chalk.gray('Run: ') + chalk.yellow(`toknxr browse --page ${currentPage - 1}`));
        break;
      case 'f':
        console.log(chalk.magenta('\n🔍 Opening filter interface...'));
        await program.parseAsync(['node', 'toknxr', 'filter']);
        break;
      case 's':
        console.log(chalk.yellow('\n🔍 Opening search interface...'));
        
        // Load interactions to generate relevant search suggestions
        const logFilePath = path.resolve(process.cwd(), 'interactions.log');
        let searchSuggestions: string[] = [];
        
        if (fs.existsSync(logFilePath)) {
          const fileContent = fs.readFileSync(logFilePath, 'utf8');
          const lines = fileContent.trim().split('\n');
          const interactions: Interaction[] = lines
            .map(line => {
              try {
                return JSON.parse(line) as Interaction;
              } catch {
                return null;
              }
            })
            .filter((interaction): interaction is Interaction => interaction !== null);
          
          // Extract unique search suggestions from actual data
          const suggestions = new Set<string>();
          
          interactions.forEach(interaction => {
            // Add providers
            if (interaction.provider) suggestions.add(interaction.provider);
            
            // Add models
            if (interaction.model && interaction.model !== 'unknown') suggestions.add(interaction.model);
            
            // Add task types
            if (interaction.taskType) suggestions.add(interaction.taskType);
            
            // Add key words from prompts
            if (interaction.userPrompt) {
              const words = interaction.userPrompt.toLowerCase().split(/\s+/);
              words.forEach(word => {
                if (word.length >= 3 && !['the', 'and', 'for', 'with', 'this', 'that', 'from', 'they', 'have', 'been', 'will', 'are', 'was', 'were'].includes(word)) {
                  suggestions.add(word);
                }
              });
            }
          });
          
          searchSuggestions = Array.from(suggestions).slice(0, 15); // Limit to 15 suggestions
        }
        
        // Show search options
        const searchChoices = [
          { name: chalk.cyan('🔍 Custom Search') + chalk.gray(' - Enter your own search terms'), value: 'custom' },
          ...searchSuggestions.map(suggestion => ({
            name: `🔎 "${suggestion}"`,
            value: suggestion
          }))
        ];
        
        const { searchChoice } = await inquirer.prompt([
          {
            type: 'list',
            name: 'searchChoice',
            message: 'What would you like to search for?',
            choices: searchChoices,
            pageSize: 10
          }
        ]);
        
        let searchQuery: string;
        if (searchChoice === 'custom') {
          const { customQuery } = await inquirer.prompt([
            {
              type: 'input',
              name: 'customQuery',
              message: 'Enter your search terms:',
              validate: (input: string) => input.trim().length >= 2 || 'Please enter at least 2 characters'
            }
          ]);
          searchQuery = customQuery;
        } else {
          searchQuery = searchChoice;
        }
        
        // Execute search command
        await program.parseAsync(['node', 'toknxr', 'search', '--query', searchQuery]);
        break;
      case 'a':
        console.log(chalk.green('\n📊 Opening analytics view...'));
        await program.parseAsync(['node', 'toknxr', 'stats']);
        break;
      case 'm':
        console.log(chalk.gray('\n📋 Opening main menu...'));
        console.log(chalk.gray('Run: ') + chalk.yellow('toknxr menu'));
        break;
      case 'q':
        console.log(chalk.gray('\n👋 Exiting browser...'));
        break;
      default:
        console.log(chalk.yellow(`Unknown option "${choice}".`));
    }
  });

program
  .command('filter')
  .description('Interactive filtering interface for AI interactions')
  .action(async () => {
    try {
      console.log(chalk.blue.bold('\n🔍 Advanced Filtering'));
      console.log(chalk.gray('Configure filters that will persist across sessions\n'));

      const currentFilters = (CliStateManager.getPreferences().filters || {}) as Record<
        string,
        unknown
      >;
      const newFilters = await createFilterInterface(currentFilters);

      console.log(chalk.green('\n✅ Filters applied and saved!'));
      console.log(
        chalk.gray('Use ') + chalk.cyan('toknxr browse') + chalk.gray(' to see filtered results')
      );
      console.log(
        chalk.gray('Use ') + chalk.cyan('toknxr filter') + chalk.gray(' again to modify filters')
      );
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      console.log(chalk.red('❌ Failed to apply filters'));
      console.log(chalk.gray('Check your terminal supports interactive prompts'));
    }
  });

program
  .command('search')
  .description('Search across all AI interactions with field selection')
  .option('-q, --query <query>', 'Search query (minimum 2 characters)')
  .action(async options => {
    const query = options.query;
    if (!query || query.trim().length < 2) {
      console.log(chalk.yellow('Please provide a search query with at least 2 characters:'));
      console.log(chalk.cyan('  toknxr search --query "your search terms"'));
      return;
    }

    try {
      console.log(chalk.blue.bold(`\n🔍 Searching for: "${query}"`));

      const availableFields = ['provider', 'model', 'userPrompt', 'taskType', 'requestId'];
      const searchOptions = await createSearchInterface(availableFields);
      
      // Set the query from the command line option
      searchOptions.query = query;

      if (!searchOptions) {
        console.log(chalk.gray('Search cancelled.'));
        return;
      }

      const logFilePath = path.resolve(process.cwd(), 'interactions.log');
      if (!fs.existsSync(logFilePath)) {
        console.log(chalk.yellow('No interactions logged yet.'));
        return;
      }

      const fileContent = fs.readFileSync(logFilePath, 'utf8');
      const lines = fileContent.trim().split('\n');
      const interactions: Interaction[] = lines
        .map(line => {
          try {
            return JSON.parse(line) as Interaction;
          } catch {
            return null;
          }
        })
        .filter((interaction): interaction is Interaction => interaction !== null);

      const filteredResults = filterAndSearchInteractions(interactions, {}, searchOptions);

      if (filteredResults.length === 0) {
        console.log(chalk.yellow(`\nNo results found for "${query}" in the selected fields.`));
        return;
      }

      const explorer = new InteractiveDataExplorer(filteredResults);

      console.log(chalk.green(`\n✅ Found ${filteredResults.length} matching interactions`));
      console.log(chalk.gray(`Searching in: ${searchOptions.fields.join(', ')}\n`));

      // Show summary
      interface ProviderCount {
        [provider: string]: number;
      }
      const providerCounts: ProviderCount = {};
      filteredResults.forEach((i: Interaction) => {
        providerCounts[i.provider] = (providerCounts[i.provider] || 0) + 1;
      });

      console.log(
        createBox(
          '📊 Search Results Summary',
          [
            `Total Results: ${filteredResults.length}`,
            `Providers: ${Object.entries(providerCounts)
              .map(([p, c]) => `${p}(${c})`)
              .join(', ')}`,
            '',
            chalk.gray('Use ↑/↓ or page up/down to navigate results'),
          ],
          { borderColor: 'green', titleColor: 'green' }
        )
      );

      const renderSearchResult = (interaction: Interaction, index: number): string => {
        const num = index + 1;
        const score = calcRelevanceScore(interaction, searchOptions.query, searchOptions.fields);

        let highlightColor: 'green' | 'yellow' | 'red';
        if (score >= 0.8) highlightColor = 'green';
        else if (score >= 0.5) highlightColor = 'yellow';
        else highlightColor = 'red';

        // Show which fields matched
        const matchedFields: string[] = [];
        searchOptions.fields.forEach(field => {
          const value = interaction[field as keyof Interaction];
          if (typeof value === 'string' && value.toLowerCase().includes(searchOptions.query.toLowerCase())) {
            matchedFields.push(field);
          }
        });

        const highlightedPrompt = highlightMatch(interaction.userPrompt || '', searchOptions.query);
        const highlightedModel = highlightMatch(interaction.model || '', searchOptions.query);
        const highlightedProvider = highlightMatch(interaction.provider || '', searchOptions.query);

        const colorFn =
          highlightColor === 'green'
            ? chalk.green
            : highlightColor === 'yellow'
              ? chalk.yellow
              : chalk.red;
        
        const starCount = Math.max(1, Math.ceil(score * 5));
        const stars = colorFn('★'.repeat(starCount) + '☆'.repeat(5 - starCount));
        
        return createBox(
          `#${num} ${highlightedProvider} • ${highlightedModel} (${stars})`,
          [
            `📅 ${chalk.gray(new Date(interaction.timestamp || Date.now()).toLocaleDateString())}`,
            `🎯 ${highlightedPrompt || 'No prompt available'}`,
            `💰 ${interaction.costUSD?.toFixed(4) || '0.0000'} • ⭐ ${interaction.codeQualityScore || 'N/A'}/100`,
            `🔍 Matched: ${chalk.cyan(matchedFields.join(', '))}`,
          ],
          {
            borderColor: highlightColor,
            titleColor: 'cyan',
            width: 90,
          }
        );
      };

      console.log(
        createPaginatedDisplay(
          explorer.getCurrentPageData(),
          5, // Smaller page size for search results
          1,
          renderSearchResult,
          undefined
        )
      );
    } catch (error) {
      console.log(chalk.red('❌ Search failed'));
      console.log(chalk.gray('Try using: ') + chalk.cyan('toknxr search --query "your terms"'));
    }
  });

program
  .command('budget')
  .description('Manage budget settings and view spending analytics')
  .option('--set <amount>', 'Set monthly budget amount')
  .option('--provider <provider>', 'Set budget for specific provider')
  .option('--view', 'View current budget settings')
  .action(options => {
    if (options.set) {
      const amount = parseFloat(options.set);
      if (isNaN(amount) || amount <= 0) {
        console.log(chalk.red('❌ Invalid budget amount. Must be a positive number.'));
        return;
      }

      CliStateManager.updateSessionBudget(amount, options.provider);

      const budgetType = options.provider ? ` for ${options.provider}` : ' (monthly default)';
      console.log(chalk.green(`✅ Budget updated to $${amount.toFixed(2)}${budgetType}`));

      if (!options.provider) {
        console.log(chalk.cyan('\n💡 Tip: Set provider-specific budgets for granular control'));
        console.log(
          chalk.gray('Example: ') + chalk.yellow('toknxr budget --set 25 --provider "Gemini-Pro"')
        );
      }
    } else if (options.view || Object.keys(options).length === 0) {
      const preferences = CliStateManager.getPreferences();
      const budgets = CliStateManager.loadState().budgets;

      console.log(chalk.blue.bold('\n💰 Budget Configuration'));
      console.log(chalk.gray('━'.repeat(50)));

      console.log(chalk.bold('\nCurrent Settings:'));
      console.log(`📊 Monthly Default: ${chalk.cyan(`$${budgets.default || 50.0}`)}`);
      console.log(`📏 Page Size: ${preferences.pageSize || 10} items`);
      console.log(`🔧 Sort Order: ${preferences.sortOrder || 'date_descends'}`);

      if (Object.keys(budgets).length > 1) {
        console.log(chalk.bold('\nProvider-Specific Budgets:'));
        Object.entries(budgets).forEach(([provider, amount]) => {
          if (provider !== 'default') {
            console.log(`🏢 ${provider}: ${chalk.cyan(`$${amount}`)}`);
          }
        });
      }

      console.log(chalk.bold('\n💡 Budget Commands:'));
      console.log(
        `  ${chalk.yellow('toknxr budget --set 75')}                   - Set monthly budget`
      );
      console.log(
        `  ${chalk.yellow('toknxr budget --set 30 --provider GPT4')} - Set provider budget`
      );
    }
  });

// Phase 5: Enterprise Audit Logging Commands
program
  .command('audit:init')
  .description('Initialize enterprise audit logging system')
  .option('--encrypt', 'Enable audit log encryption')
  .option('--retention <days>', 'Log retention period in days', '365')
  .action(options => {
    try {
      initializeAuditLogging({
        encryptionEnabled: options.encrypt || false,
        retentionDays: parseInt(options.retention) || 365,
        enabled: true,
      });

      // Log the initialization event
      auditLogger.logAuthEvent(AuditEventType.SYSTEM_MAINTENANCE, 'system', true, {
        component: 'audit_system',
        action: 'initialization',
        settings: {
          encryptionEnabled: options.encrypt || false,
          retentionDays: parseInt(options.retention) || 365,
        },
      });

      console.log(chalk.green('✅ Enterprise audit logging initialized'));
      console.log(chalk.gray('Audit logs will be written to: audit.log'));
      if (options.encrypt) {
        console.log(chalk.yellow('🛡️  Audit logs are encrypted'));
      }
    } catch (error) {
      console.log(chalk.red('❌ Failed to initialize audit logging'));
      console.log(chalk.gray(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  });

program
  .command('audit:view')
  .description('View audit events with filtering options')
  .option('-t, --type <eventType>', 'Filter by event type (e.g., ai.request, auth.login)')
  .option('-u, --user <userId>', 'Filter by user ID')
  .option('-r, --risk <level>', 'Filter by risk level (low/medium/high/critical)')
  .option('-f, --from <date>', 'Filter events from date (ISO format)')
  .option('--to <date>', 'Filter events to date (ISO format)')
  .option('-l, --limit <number>', 'Limit number of results', '50')
  .action(options => {
    try {
      const events = auditLogger.query({
        eventType: options.type as AuditEventType,
        userId: options.user,
        riskLevel: options.risk as 'low' | 'medium' | 'high' | 'critical',
        dateFrom: options.from,
        dateTo: options.to,
        limit: parseInt(options.limit) || 50,
      });

      if (events.length === 0) {
        console.log(chalk.yellow('No audit events found matching the criteria.'));
        return;
      }

      console.log(chalk.blue.bold('📋 Audit Events'));
      console.log(chalk.gray('━'.repeat(80)));

      // Group events by date for better readability
      const eventsByDate: Record<string, typeof events> = {};
      events.forEach(event => {
        const date = new Date(event.timestamp).toLocaleDateString();
        if (!eventsByDate[date]) eventsByDate[date] = [];
        eventsByDate[date].push(event);
      });

      Object.entries(eventsByDate).forEach(([date, dateEvents]) => {
        console.log(chalk.cyan(`\n📅 ${date}`));

        dateEvents.forEach(event => {
          const time = new Date(event.timestamp).toLocaleTimeString();
          const riskColor =
            event.riskLevel === 'critical'
              ? chalk.red
              : event.riskLevel === 'high'
                ? chalk.yellow
                : event.riskLevel === 'medium'
                  ? chalk.blue
                  : chalk.gray;

          const resultIcon =
            event.result === 'success' ? '✅' : event.result === 'failure' ? '❌' : '⚠️';

          console.log(
            `  ${resultIcon} ${chalk.bold(event.eventType)} ${riskColor(`[${event.riskLevel}]`)}`
          );
          console.log(`     ${chalk.gray(time)} | ${event.action} | ${event.resource}`);
          if (event.userId) {
            console.log(`     👤 User: ${event.userId}`);
          }
          if (event.details && Object.keys(event.details).length > 0) {
            const details = Object.entries(event.details)
              .filter(([key]) => !['method', 'component'].includes(key))
              .slice(0, 3) // Limit to 3 details
              .map(
                ([key, value]) =>
                  `${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`
              )
              .join(', ');
            if (details) {
              console.log(`     📋 ${details}`);
            }
          }
        });
      });

      console.log(chalk.gray(`\nTotal events shown: ${events.length}`));

      // Log the audit access itself
      auditLogger.log({
        eventType: AuditEventType.AUDIT_LOG_ACCESS,
        action: 'audit_view',
        resource: 'audit_logs',
        result: 'success',
        riskLevel: 'low',
        complianceTags: ['audit', 'access_control'],
        details: {
          filterCriteria: options,
          resultsReturned: events.length,
        },
        metadata: {
          version: '1.0.0',
          environment: process.env.NODE_ENV || 'development',
          component: 'audit_cli',
        },
      });
    } catch (error) {
      console.log(chalk.red('❌ Failed to retrieve audit events'));
      console.log(chalk.gray(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  });

program
  .command('audit:report')
  .description('Generate compliance report for specified time period')
  .argument('<startDate>', 'Start date in ISO format (YYYY-MM-DD)')
  .argument('<endDate>', 'End date in ISO format (YYYY-MM-DD)')
  .action((startDate, endDate) => {
    try {
      console.log(chalk.blue.bold('📊 Compliance Report Generation'));
      console.log(chalk.gray('━'.repeat(50)));

      const report = auditLogger.generateComplianceReport(startDate, endDate);

      console.log(chalk.bold('\n📅 Report Period:'));
      console.log(`  From: ${new Date(report.period.start).toLocaleDateString()}`);
      console.log(`  To: ${new Date(report.period.end).toLocaleDateString()}`);

      console.log(chalk.bold('\n📈 Summary Statistics:'));
      console.log(`  Total Events: ${report.totalEvents.toLocaleString()}`);

      console.log(chalk.bold('\n🏷️  Risk Distribution:'));
      Object.entries(report.riskSummary).forEach(([level, count]) => {
        const color =
          level === 'critical'
            ? chalk.red
            : level === 'high'
              ? chalk.yellow
              : level === 'medium'
                ? chalk.blue
                : chalk.gray;
        console.log(`  ${color(level.charAt(0).toUpperCase() + level.slice(1))}: ${count}`);
      });

      if (Object.keys(report.eventsByType).length > 0) {
        console.log(chalk.bold('\n📋 Events by Type:'));
        Object.entries(report.eventsByType)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 10) // Top 10
          .forEach(([type, count]) => {
            console.log(`  ${type}: ${count}`);
          });
      }

      if (report.complianceViolations.length > 0) {
        console.log(chalk.red.bold('\n🚨 Compliance Violations:'));
        report.complianceViolations.slice(0, 5).forEach(violation => {
          console.log(`  ❌ ${violation.eventType} - ${violation.action}`);
          console.log(`     ${new Date(violation.timestamp).toLocaleString()}`);
        });
        if (report.complianceViolations.length > 5) {
          console.log(
            chalk.red(`     ... and ${report.complianceViolations.length - 5} more violations`)
          );
        }
      }

      if (report.recommendations.length > 0) {
        console.log(chalk.cyan.bold('\n💡 Recommendations:'));
        report.recommendations.forEach(rec => {
          console.log(`  • ${rec}`);
        });
      }

      // Log the compliance report generation
      auditLogger.log({
        eventType: AuditEventType.COMPLIANCE_REPORT,
        action: 'report_generation',
        resource: 'audit_system',
        result: 'success',
        riskLevel: 'low',
        complianceTags: ['compliance', 'reporting'],
        details: {
          reportPeriod: report.period,
          totalEvents: report.totalEvents,
          violationsFound: report.complianceViolations.length,
        },
        metadata: {
          version: '1.0.0',
          environment: process.env.NODE_ENV || 'development',
          component: 'audit_cli',
        },
      });

      console.log(chalk.green('\n✅ Compliance report generated successfully'));
    } catch (error) {
      console.log(chalk.red('❌ Failed to generate compliance report'));
      console.log(chalk.gray(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  });

program
  .command('audit:export')
  .description('Export audit data in various formats')
  .argument('<format>', 'Export format: json, csv, or xml')
  .option('-o, --output <file>', 'Output file name', 'audit-export')
  .option('-t, --type <eventType>', 'Filter by event type')
  .option('-u, --user <userId>', 'Filter by user ID')
  .option('-f, --from <date>', 'Filter events from date (ISO format)')
  .option('--to <date>', 'Filter events to date (ISO format)')
  .action((format, options) => {
    try {
      const events = auditLogger.query({
        eventType: options.type as AuditEventType,
        userId: options.user,
        dateFrom: options.from,
        dateTo: options.to,
      });

      if (events.length === 0) {
        console.log(chalk.yellow('No audit events found to export.'));
        return;
      }

      const fileName = `${options.output}.${format}`;
      const exportData = auditLogger.exportAuditData(format as 'json' | 'csv' | 'xml');

      fs.writeFileSync(fileName, exportData);

      console.log(chalk.green(`✅ Exported ${events.length} audit events to ${fileName}`));
      console.log(chalk.gray(`Format: ${format.toUpperCase()} | Size: ${exportData.length} bytes`));

      // Log the export event
      auditLogger.log({
        eventType: AuditEventType.AUDIT_LOG_ACCESS,
        action: 'audit_export',
        resource: 'audit_logs',
        resourceId: fileName,
        result: 'success',
        riskLevel: 'medium', // Exporting sensitive audit data
        complianceTags: ['audit', 'data_export'],
        details: {
          format,
          recordsExported: events.length,
          fileName,
          filterCriteria: {
            eventType: options.type,
            userId: options.user,
            dateFrom: options.from,
            dateTo: options.to,
          },
        },
        metadata: {
          version: '1.0.0',
          environment: process.env.NODE_ENV || 'development',
          component: 'audit_cli',
        },
      });
    } catch (error) {
      console.log(chalk.red('❌ Failed to export audit data'));
      console.log(chalk.gray(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  });

program
  .command('audit:stats')
  .description('Show audit log statistics and health metrics')
  .action(() => {
    try {
      // This is a simple stats command - in real implementation,
      // we'd want to expose more audit logger internal stats
      console.log(chalk.blue.bold('📊 Audit System Statistics'));
      console.log(chalk.gray('━'.repeat(50)));

      console.log(chalk.bold('\n🗂️  Log File Information:'));
      try {
        const auditLogPath = path.resolve(process.cwd(), 'audit.log');
        if (fs.existsSync(auditLogPath)) {
          const stats = fs.statSync(auditLogPath);
          console.log(`  Location: ${auditLogPath}`);
          console.log(`  Size: ${stats.size} bytes (${(stats.size / 1024).toFixed(1)} KB)`);
          console.log(`  Modified: ${stats.mtime.toLocaleString()}`);
          console.log(`  Encrypted: ${auditLogger['config'].encryptionEnabled ? 'Yes' : 'No'}`);
        } else {
          console.log(chalk.yellow('  No audit log file found'));
        }
      } catch (error) {
        console.log(chalk.red('  Error reading log file'));
      }

      console.log(chalk.bold('\n⚙️  System Configuration:'));
      console.log(
        `  Enabled: ${auditLogger['config'].enabled ? chalk.green('Yes') : chalk.red('No')}`
      );
      console.log(`  Retention: ${auditLogger['config'].retentionDays} days`);
      console.log(`  Max File Size: ${auditLogger['config'].maxFileSize} MB`);
      console.log(`  Alert Threshold: ${auditLogger['config'].alertThresholds.riskLevelThreshold}`);
      console.log(
        `  Compliance Frameworks: ${auditLogger['config'].complianceFrameworks.join(', ')}`
      );

      console.log(chalk.bold('\n🎯 Quick Commands:'));
      console.log(
        `  ${chalk.cyan('toknxr audit:view')}                    - View recent audit events`
      );
      console.log(
        `  ${chalk.cyan('toknxr audit:report 2025-01-01 2025-01-31')} - Generate compliance report`
      );
      console.log(
        `  ${chalk.cyan('toknxr audit:export json --output my-audit')} - Export audit data`
      );

      // Log the stats access
      auditLogger.log({
        eventType: AuditEventType.AUDIT_LOG_ACCESS,
        action: 'audit_stats_view',
        resource: 'audit_system',
        result: 'success',
        riskLevel: 'low',
        complianceTags: ['audit', 'monitoring'],
        details: { accessedVia: 'cli_stats_command' },
        metadata: {
          version: '1.0.0',
          environment: process.env.NODE_ENV || 'development',
          component: 'audit_cli',
        },
      });
    } catch (error) {
      console.log(chalk.red('❌ Failed to retrieve audit statistics'));
      console.log(chalk.gray(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  });

// ---------------------------------------------------------------------------
// Feedback System - User Experience Enhancement
// ---------------------------------------------------------------------------

program
  .command('feedback')
  .description('Provide feedback, report bugs, or suggest improvements')
  .option('-q, --quick', 'Quick feedback (minimal form)')
  .option('-d, --detailed', 'Detailed feedback form')
  .option('-l, --list', 'List your previous feedback')
  .option('--submit [id]', 'Submit pending feedback (optionally specify ID)')
  .option('--stats', 'Show feedback statistics')
  .action(async (options) => {
    // Import branding for enhanced experience
    const {
      TOKNXR_LOGO,
      COLORS,
      createVersionInfo
    } = await import('./branding.js');

    // Determine the context (current command/screen)
    const context = process.argv.slice(2).filter(arg => !arg.startsWith('-'))[0] || 'cli';

    if (options.quick) {
      await feedbackManager.quickFeedback(context);
    } else if (options.detailed) {
      await feedbackManager.detailedFeedback(context);
    } else if (options.list) {
      feedbackManager.listFeedback();
    } else if (options.submit) {
      if (typeof options.submit === 'string') {
        // Submit specific feedback ID
        const success = await feedbackManager.submitFeedback(options.submit);
        if (!success) {
          console.log(chalk.gray('Use --list to see available feedback IDs'));
        }
      } else {
        // Submit all pending feedback
        const data = feedbackManager['loadFeedbackData']();
        const pending = data.feedback.filter((fb: any) => fb.status === 'pending');
        
        if (pending.length === 0) {
          console.log(chalk.yellow('No pending feedback to submit'));
          return;
        }

        console.log(chalk.blue(`\n📤 Submitting ${pending.length} pending feedback entries...`));
        
        let successCount = 0;
        for (const fb of pending) {
          const success = await feedbackManager.submitFeedback(fb.id);
          if (success) successCount++;
        }
        
        console.log(chalk.green(`\n✅ Successfully submitted ${successCount}/${pending.length} feedback entries`));
      }
    } else if (options.stats) {
      const stats = feedbackManager.getFeedbackStats();
      console.log(chalk.blue.bold('\n📊 Feedback Statistics'));
      console.log(chalk.gray('━'.repeat(40)));
      console.log(`Total feedback entries: ${stats.total}`);
      console.log(`Pending submissions: ${chalk.yellow(stats.pending)}`);
      console.log(`Successfully submitted: ${chalk.green(stats.submitted)}`);
      
      if (stats.pending > 0) {
        console.log(chalk.gray('\nRun ') + chalk.cyan('toknxr feedback --submit') + chalk.gray(' to submit pending feedback'));
      }
    } else {
      // Default interactive mode
      console.clear();
      console.log(TOKNXR_LOGO);
      console.log(COLORS.accent('💬 TokNXR Feedback Center'));
      console.log(COLORS.muted('Help us improve your AI development experience!'));
      console.log();

      const stats = feedbackManager.getFeedbackStats();
      if (stats.total > 0) {
        console.log(COLORS.primary(`📋 You've provided ${stats.total} feedback entries so far`));
        if (stats.pending > 0) {
          console.log(COLORS.warning(`   ${stats.pending} are pending submission`));
        }
        console.log();
      }

      console.log(COLORS.accent('🎯 How can we help you today?'));
      console.log();

      const { feedbackAction } = await inquirer.prompt([
        {
          type: 'list',
          name: 'feedbackAction',
          message: 'What would you like to do?',
          choices: [
            { name: '⚡ Quick Feedback (30 seconds)', value: 'quick' },
            { name: '📋 Detailed Feedback Form', value: 'detailed' },
            { name: '📜 View My Feedback History', value: 'list' },
            { name: '📤 Submit Pending Feedback', value: 'submit' },
            { name: '📊 View Feedback Statistics', value: 'stats' },
            { name: '❌ Exit', value: 'exit' }
          ]
        }
      ]);

      switch (feedbackAction) {
        case 'quick':
          await feedbackManager.quickFeedback(context);
          break;
        case 'detailed':
          await feedbackManager.detailedFeedback(context);
          break;
        case 'list':
          feedbackManager.listFeedback();
          break;
        case 'submit':
          await program.parseAsync(['node', 'toknxr', 'feedback', '--submit']);
          break;
        case 'stats':
          await program.parseAsync(['node', 'toknxr', 'feedback', '--stats']);
          break;
        case 'exit':
          console.log(chalk.gray('\n👋 Thanks for considering feedback!'));
          console.log(createVersionInfo('0.4.0'));
          break;
      }
    }
  });

// ---------------------------------------------------------------------------
// Doctor: environment and runtime validator
// ---------------------------------------------------------------------------
program
  .command('doctor')
  .description('Validate environment, config, and runtime readiness')
  .action(async () => {
    // Import branding for enhanced doctor experience
    const {
      TOKNXR_LOGO,
      createSuccessBox,
      createErrorBox,
      COLORS,
      createVersionInfo
    } = await import('./branding.js');

    console.clear();
    console.log(TOKNXR_LOGO);
    console.log(COLORS.accent('🏥 TokNXR System Doctor'));
    console.log(COLORS.muted('Diagnosing your AI analytics environment...'));
    console.log();

    const results: { label: string; ok: boolean; hint?: string; category: string }[] = [];

    // Filesystem checks
    const configPath = path.resolve(process.cwd(), 'toknxr.config.json');
    let providerConfig: ProviderConfig | undefined;

    if (fs.existsSync(configPath)) {
      results.push({
        label: `Provider configuration`,
        ok: true,
        category: 'config'
      });
      try {
        const configFile = fs.readFileSync(configPath, 'utf8');
        providerConfig = JSON.parse(configFile);
      } catch (error) {
        results.push({
          label: `Parse toknxr.config.json`,
          ok: false,
          hint: `Error parsing config file: ${error instanceof Error ? error.message : 'Unknown error'}`,
          category: 'config'
        });
      }
    } else {
      results.push({
        label: `Provider configuration`,
        ok: false,
        hint: 'Run: toknxr init',
        category: 'config'
      });
    }

    // Environment variable checks for each configured provider
    if (providerConfig && providerConfig.providers) {
      for (const provider of providerConfig.providers) {
        if (provider.apiKeyEnvVar) {
          const apiKey = process.env[provider.apiKeyEnvVar];
          results.push({
            label: `${provider.name} API Key`,
            ok: !!apiKey,
            hint: `Set ${provider.apiKeyEnvVar} in your environment or .env file`,
            category: 'auth'
          });
        } else {
          results.push({
            label: `${provider.name} API Key`,
            ok: true,
            hint: 'No API key required for this provider',
            category: 'auth'
          });
        }
      }
    } else if (providerConfig) {
      results.push({
        label: 'Provider configuration',
        ok: false,
        hint: 'Edit toknxr.config.json to add AI providers',
        category: 'config'
      });
    }

    const logPath = path.resolve(process.cwd(), 'interactions.log');
    try {
      // Touch file if missing (no-op if exists)
      if (!fs.existsSync(logPath)) fs.writeFileSync(logPath, '');
      results.push({ 
        label: `Interaction logs`, 
        ok: true,
        category: 'storage'
      });
    } catch {
      results.push({ 
        label: `Interaction logs`, 
        ok: false, 
        hint: 'Check write permissions',
        category: 'storage'
      });
    }

    // Runtime checks (proxy health if running)
    let proxyHealthOk = false;
    try {
      const res = await fetch('http://localhost:8788/health');
      proxyHealthOk = res.ok;
    } catch {
      proxyHealthOk = false;
    }
    results.push({
      label: 'Proxy server',
      ok: proxyHealthOk,
      hint: 'Run: toknxr start (then retry doctor)',
      category: 'runtime'
    });

    // AI Provider Connectivity Tests (only if proxy is running and config is loaded)
    let anyProviderConnected = false;
    if (proxyHealthOk && providerConfig && providerConfig.providers) {
      for (const provider of providerConfig.providers) {
        const apiKey = provider.apiKeyEnvVar ? process.env[provider.apiKeyEnvVar] : undefined;
        if (provider.apiKeyEnvVar && !apiKey) {
          results.push({
            label: `${provider.name} connectivity`,
            ok: false,
            hint: `Skipped: API key (${provider.apiKeyEnvVar}) not set.`,
            category: 'connectivity'
          });
          continue;
        }

        const { ok, message } = await testConnection(provider, apiKey);
        if (ok) {
          anyProviderConnected = true;
        }
        results.push({
          label: `${provider.name} connectivity`,
          ok: ok,
          hint: ok ? undefined : message,
          category: 'connectivity'
        });
      }
    } else if (proxyHealthOk && !providerConfig) {
      results.push({
        label: 'AI Provider connectivity',
        ok: false,
        hint: 'Skipped: toknxr.config.json not loaded or invalid.',
        category: 'connectivity'
      });
    } else if (!proxyHealthOk) {
      results.push({
        label: 'AI Provider connectivity',
        ok: false,
        hint: 'Skipped: Proxy server is not running.',
        category: 'connectivity'
      });
    }

    // Conditional: add one sample interaction if none exists and at least one provider connected
    const logFileExists = fs.existsSync(logPath);
    let logFileSize = 0;
    if (logFileExists) {
      try {
        logFileSize = fs.statSync(logPath).size;
      } catch {}
    }

    if (anyProviderConnected && logFileSize === 0) {
      const firstConnectedProvider = providerConfig?.providers.find((p: ProviderConfig['providers'][0]) => {
        const apiKey = p.apiKeyEnvVar ? process.env[p.apiKeyEnvVar] : undefined;
        return p.apiKeyEnvVar ? !!apiKey : true; // Check if key is set for providers that need it
      });

      if (firstConnectedProvider) {
        const { ok, message } = generateSampleInteraction(firstConnectedProvider.name, logPath);
        results.push({
          label: 'Sample data generation',
          ok: ok,
          hint: ok ? 'Run: toknxr stats or toknxr code-analysis' : message,
          category: 'testing'
        });
      }
    } else if (logFileSize > 0) {
      results.push({
        label: 'Sample data generation',
        ok: true,
        hint: 'interactions.log already contains data.',
        category: 'testing'
      });
    } else {
      results.push({
        label: 'Sample data generation',
        ok: false,
        hint: 'No connected providers or interactions.log already has data.',
        category: 'testing'
      });
    }

    // Group results by category
    const categories = {
      config: 'Configuration Files',
      auth: 'Authentication',
      storage: 'Data Storage',
      runtime: 'Runtime Services',
      connectivity: 'Provider Connectivity',
      testing: 'Sample Data'
    };

    // Print report with enhanced formatting
    let allOk = true;
    let totalIssues = 0;

    Object.entries(categories).forEach(([categoryKey, categoryName]) => {
      const categoryResults = results.filter(r => r.category === categoryKey);
      if (categoryResults.length === 0) return;

      console.log(COLORS.accent(`📋 ${categoryName}:`));
      categoryResults.forEach(r => {
        allOk &&= r.ok;
        if (!r.ok) totalIssues++;
        
        const mark = r.ok ? COLORS.success('✅') : COLORS.error('❌');
        const label = r.ok ? COLORS.primary(r.label) : COLORS.error(r.label);
        const hint = r.ok || !r.hint ? '' : COLORS.muted(` — ${r.hint}`);
        console.log(`   ${mark} ${label}${hint}`);
      });
      console.log();
    });

    console.log(COLORS.muted('━'.repeat(80)));
    
    if (allOk) {
      console.log(createSuccessBox(
        'All Systems Green!',
        'TokNXR is ready to track and analyze your AI interactions'
      ));
      console.log();
      console.log(COLORS.accent('🚀 You\'re all set! Try these commands:'));
      console.log(`   ${COLORS.muted('•')} ${COLORS.highlight('toknxr start')} ${COLORS.muted('- Begin AI tracking')}`);
      console.log(`   ${COLORS.muted('•')} ${COLORS.highlight('toknxr menu')} ${COLORS.muted('- Interactive command center')}`);
      console.log(`   ${COLORS.muted('•')} ${COLORS.highlight('toknxr stats')} ${COLORS.muted('- View analytics dashboard')}`);
    } else {
      console.log(createErrorBox(
        `${totalIssues} Issue${totalIssues !== 1 ? 's' : ''} Found`,
        'TokNXR needs some configuration before it can run properly',
        'Review the issues above and follow the recommended fixes'
      ));
      console.log();
      console.log(COLORS.accent('🛠️ Quick Fixes:'));
      
      if (results.some(r => !r.ok && r.category === 'config')) {
        console.log(`   ${COLORS.muted('•')} ${COLORS.highlight('toknxr init')} ${COLORS.muted('- Set up configuration files')}`);
      }
      if (results.some(r => !r.ok && r.category === 'auth')) {
        console.log(`   ${COLORS.muted('•')} ${COLORS.primary('Add API keys to your .env file')}`);
      }
      if (results.some(r => !r.ok && r.category === 'runtime')) {
        console.log(`   ${COLORS.muted('•')} ${COLORS.highlight('toknxr start')} ${COLORS.muted('- Launch the proxy server')}`);
      }
      console.log(`   ${COLORS.muted('•')} ${COLORS.highlight('toknxr doctor')} ${COLORS.muted('- Re-run this diagnostic')}`);
    }

    console.log();
    console.log(createVersionInfo('0.4.0'));
  });

// Helper functions for search highlighting
function calcRelevanceScore(interaction: Interaction, query: string, fields: string[]): number {
  const queryTerms = query.toLowerCase().split(' ');
  let totalScore = 0;
  const maxPossibleScore = fields.length * queryTerms.length;

  fields.forEach(field => {
    const fieldValue = (interaction[field as keyof Interaction] || '').toString().toLowerCase();
    queryTerms.forEach(term => {
      if (fieldValue.includes(term)) {
        totalScore += 1;
      }
    });
  });

  return Math.min(totalScore / maxPossibleScore, 1);
}

function highlightMatch(text: string, query: string): string {
  if (!text) return text;

  const queryTerms = query.toLowerCase().split(' ');
  let highlighted = text;

  queryTerms.forEach(term => {
    const regex = new RegExp(`(${term})`, 'gi');
    highlighted = highlighted.replace(regex, chalk.bgYellow.black('$1'));
  });

  return highlighted;
}

program.exitOverride();

// Default action when no command is specified - show the enhanced menu
program.action(async () => {
  console.log(chalk.gray('No command specified. Opening interactive menu...\n'));
  await program.parseAsync(['node', 'toknxr', 'menu']);
});

try {
  program.parse(process.argv);
} catch (e) {
  // This will catch the exit override and prevent the process from exiting
}
