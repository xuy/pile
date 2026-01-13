/**
 * Pre-configured teaching scenarios
 */
import { LMSRMarket } from '../core/lmsr.js';
export interface Scenario {
    id: string;
    name: string;
    description: string;
    question: string;
    market: LMSRMarket;
    initialCash: number;
    guidance: string[];
    learningGoals: string[];
}
export declare const scenarios: Scenario[];
export declare function getScenario(id: string): Scenario | undefined;
export declare function getAllScenarios(): Scenario[];
