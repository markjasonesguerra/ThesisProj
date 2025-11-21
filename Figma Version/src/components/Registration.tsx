import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { ArrowLeft, ArrowRight, Upload, User, Briefcase, Users, Camera, CheckCircle } from 'lucide-react';
import type { User } from '../App';

interface RegistrationProps {
  onRegister: (userData: Partial<User>) => void;
  onNavigate: (screen: string) => void;
  isCompletingProfile?: boolean;
  user?: User | null;
}

export function Registration({ onRegister, onNavigate, isCompletingProfile = false, user }: RegistrationProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<Partial<User>>(
    isCompletingProfile && user ? {
      ...user,
      emergencyContact: user.emergencyContact || {
        name: '',
        relationship: '',
        phone: '',
        address: ''
      }
    } : {
      emergencyContact: {
        name: '',
        relationship: '',
        phone: '',
        address: ''
      }
    }
  );
  const [profileImage, setProfileImage] = useState<string | null>(null);

  const handleInputChange = (field: keyof User, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleEmergencyContactChange = (field: keyof User['emergencyContact'], value: string) => {
    setFormData(prev => ({
      ...prev,
      emergencyContact: {
        ...prev.emergencyContact!,
        [field]: value
      }
    }));
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setProfileImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, 4));
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  const handleSubmit = () => {
    // Construct full address string for backward compatibility
    const fullAddress = [
      formData.addressLine1,
      formData.addressLine2,
      formData.city,
      formData.province,
      formData.postalCode
    ].filter(Boolean).join(', ');

    const completeData = {
      ...formData,
      address: fullAddress,
      profilePicture: profileImage || undefined,
    };
    onRegister(completeData);
  };

  const companies = [
    'BDO Unibank Inc.',
    'Metrobank',
    'Bank of the Philippine Islands (BPI)',
    'Security Bank',
    'Philippine National Bank (PNB)',
    'UnionBank',
    'RCBC',
    'EastWest Bank',
    'Maybank Philippines',
    'HSBC Philippines',
    'Other'
  ];

  const religions = [
    'Roman Catholic',
    'Islam',
    'Iglesia ni Cristo',
    'Philippine Independent Church (Aglipayan)',
    'Seventh-day Adventist',
    'Bible Baptist Church',
    'United Church of Christ in the Philippines',
    'Jehovah\'s Witnesses',
    'Church of Christ',
    'Other'
  ];

  const unionAffiliations = [
    'BDO Employees Association',
    'Metrobank Employees Union',
    'BPI Employees Union',
    'PNB Employees Union',
    'Other'
  ];

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="flex items-center mb-6">
              <User className="w-6 h-6 text-blue-600 mr-2" />
              <h3 className="text-lg font-semibold">Personal Information</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name *
                </label>
                <Input
                  type="text"
                  value={formData.firstName || ''}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name *
                </label>
                <Input
                  type="text"
                  value={formData.lastName || ''}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date of Birth *
                </label>
                <Input
                  type="date"
                  value={formData.dateOfBirth || ''}
                  onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Place of Birth *
                </label>
                <Input
                  type="text"
                  value={formData.placeOfBirth || ''}
                  onChange={(e) => handleInputChange('placeOfBirth', e.target.value)}
                  placeholder="City, Province, Country"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Complete Address *
              </label>
              <div className="space-y-3">
                <Input
                  type="text"
                  placeholder="House No., Street Name, Building"
                  value={formData.addressLine1 || ''}
                  onChange={(e) => handleInputChange('addressLine1', e.target.value)}
                  required
                />
                <Input
                  type="text"
                  placeholder="Barangay, Subdivision (Optional)"
                  value={formData.addressLine2 || ''}
                  onChange={(e) => handleInputChange('addressLine2', e.target.value)}
                />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Input
                    type="text"
                    placeholder="City/Municipality"
                    value={formData.city || ''}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    required
                  />
                  <Input
                    type="text"
                    placeholder="Province"
                    value={formData.province || ''}
                    onChange={(e) => handleInputChange('province', e.target.value)}
                    required
                  />
                  <Input
                    type="text"
                    placeholder="Postal Code"
                    value={formData.postalCode || ''}
                    onChange={(e) => handleInputChange('postalCode', e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Marital Status *
                </label>
                <Select onValueChange={(value) => handleInputChange('maritalStatus', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Single">Single</SelectItem>
                    <SelectItem value="Married">Married</SelectItem>
                    <SelectItem value="Widowed">Widowed</SelectItem>
                    <SelectItem value="Separated">Separated</SelectItem>
                    <SelectItem value="Divorced">Divorced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Number of Children
                </label>
                <Input
                  type="number"
                  min="0"
                  value={formData.numberOfChildren || 0}
                  onChange={(e) => handleInputChange('numberOfChildren', parseInt(e.target.value) || 0)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gender *
                </label>
                <Select onValueChange={(value) => handleInputChange('gender', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other (please state)</SelectItem>
                    <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Religion
                </label>
                <Select onValueChange={(value) => handleInputChange('religion', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select religion" />
                  </SelectTrigger>
                  <SelectContent>
                    {religions.map((religion) => (
                      <SelectItem key={religion} value={religion}>
                        {religion}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Educational Attainment *
              </label>
              <Input
                type="text"
                value={formData.education || ''}
                onChange={(e) => handleInputChange('education', e.target.value)}
                placeholder="e.g., Bachelor of Science in Banking"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address *
                </label>
                <Input
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number *
                </label>
                <Input
                  type="tel"
                  value={formData.phone || ''}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="+63 917 123 4567"
                  required
                />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="flex items-center mb-6">
              <Briefcase className="w-6 h-6 text-blue-600 mr-2" />
              <h3 className="text-lg font-semibold">Employment Information</h3>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Company *
              </label>
              <Select onValueChange={(value) => handleInputChange('company', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your company" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((company) => (
                    <SelectItem key={company} value={company}>
                      {company}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Position/Job Title *
                </label>
                <Input
                  type="text"
                  value={formData.position || ''}
                  onChange={(e) => handleInputChange('position', e.target.value)}
                  placeholder="e.g., Senior Bank Officer"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Department
                </label>
                <Input
                  type="text"
                  value={formData.department || ''}
                  onChange={(e) => handleInputChange('department', e.target.value)}
                  placeholder="e.g., Corporate Banking"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Years Employed
              </label>
              <Input
                type="number"
                min="0"
                value={formData.yearsEmployed || ''}
                onChange={(e) => handleInputChange('yearsEmployed', parseInt(e.target.value) || 0)}
                placeholder="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Union Affiliation
              </label>
              <Select onValueChange={(value) => handleInputChange('unionAffiliation', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select union affiliation" />
                </SelectTrigger>
                <SelectContent>
                  {unionAffiliations.map((affiliation) => (
                    <SelectItem key={affiliation} value={affiliation}>
                      {affiliation}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Union Position *
              </label>
              <Select onValueChange={(value) => handleInputChange('unionPosition', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select union position" />
                </SelectTrigger>
                <SelectContent>
                  {unionPositions.map((position) => (
                    <SelectItem key={position} value={position}>
                      {position}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="flex items-center mb-6">
              <Users className="w-6 h-6 text-blue-600 mr-2" />
              <h3 className="text-lg font-semibold">Emergency Contact</h3>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name *
              </label>
              <Input
                type="text"
                value={formData.emergencyContact?.name || ''}
                onChange={(e) => handleEmergencyContactChange('name', e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Relationship *
              </label>
              <Select onValueChange={(value) => handleEmergencyContactChange('relationship', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select relationship" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Spouse">Spouse</SelectItem>
                  <SelectItem value="Parent">Parent</SelectItem>
                  <SelectItem value="Child">Child</SelectItem>
                  <SelectItem value="Sibling">Sibling</SelectItem>
                  <SelectItem value="Friend">Friend</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number *
              </label>
              <Input
                type="tel"
                value={formData.emergencyContact?.phone || ''}
                onChange={(e) => handleEmergencyContactChange('phone', e.target.value)}
                placeholder="+63 917 123 4567"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address *
              </label>
              <Textarea
                value={formData.emergencyContact?.address || ''}
                onChange={(e) => handleEmergencyContactChange('address', e.target.value)}
                placeholder="Complete address"
                required
              />
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="flex items-center mb-6">
              <Camera className="w-6 h-6 text-blue-600 mr-2" />
              <h3 className="text-lg font-semibold">Photo & Review</h3>
            </div>

            {/* Photo Upload */}
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700">
                2x2 ID Photo *
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                {profileImage ? (
                  <div className="space-y-4">
                    <img
                      src={profileImage}
                      alt="Profile"
                      className="w-24 h-24 object-cover rounded-lg mx-auto"
                    />
                    <p className="text-sm text-green-600">Photo uploaded successfully!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Upload className="w-8 h-8 text-gray-400 mx-auto" />
                    <p className="text-sm text-gray-500">
                      Click to upload your 2x2 ID photo
                    </p>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="mt-4"
                />
              </div>
            </div>

            {/* Information Review */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <h4 className="font-semibold text-gray-800">Review Your Information</h4>
              <div className="text-sm space-y-2">
                <p><strong>Name:</strong> {formData.firstName} {formData.lastName}</p>
                <p><strong>Email:</strong> {formData.email}</p>
                <p><strong>Phone:</strong> {formData.phone}</p>
                <p><strong>Company:</strong> {formData.company}</p>
                <p><strong>Position:</strong> {formData.position}</p>
                <p><strong>Union Position:</strong> {formData.unionPosition}</p>
              </div>
            </div>

            {/* Data Privacy Notice */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-800 mb-2">Data Privacy Notice</h4>
              <p className="text-sm text-blue-700">
                By submitting this form, you consent to the collection and processing of your personal data 
                in accordance with the Data Privacy Act of 2012. Your information will be used solely for 
                union membership management and benefits administration.
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => currentStep === 1 ? onNavigate(isCompletingProfile ? 'dashboard' : 'landing') : prevStep()}
              className="p-2"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center space-x-2">
              <div className="bg-blue-600 p-2 rounded-lg">
                <User className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-semibold text-gray-800">
                  {isCompletingProfile ? 'Complete Your Profile' : 'Member Registration'}
                </h1>
                <p className="text-xs text-gray-600">
                  {isCompletingProfile ? 'Finish your registration to access all benefits' : `Step ${currentStep} of 4 - ALUzon Registration`}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 md:p-8">
        <div className="max-w-4xl mx-auto">

          {/* Progress Section */}
          <div className="mb-8">
            {/* Step Indicators */}
            <div className="flex items-center justify-between mb-6">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="flex items-center">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                      i + 1 <= currentStep
                        ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg'
                        : i + 1 === currentStep + 1
                        ? 'bg-blue-50 text-blue-600 border-2 border-blue-200'
                        : 'bg-gray-100 text-gray-400 border border-gray-200'
                    }`}
                  >
                    {i + 1 < currentStep ? (
                      <CheckCircle className="w-6 h-6" />
                    ) : (
                      <span className="font-semibold">{i + 1}</span>
                    )}
                  </div>
                  {i < 3 && (
                    <div className="flex-1 h-1 mx-4">
                      <div className={`h-full rounded-full transition-all duration-500 ${
                        i + 1 < currentStep ? 'bg-gradient-to-r from-blue-500 to-blue-600' : 'bg-gray-200'
                      }`} />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Step Labels */}
            <div className="grid grid-cols-4 gap-4 text-center text-sm">
              <div className={`${currentStep >= 1 ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
                <div className="hidden sm:block">Personal Info</div>
                <div className="sm:hidden">Personal</div>
              </div>
              <div className={`${currentStep >= 2 ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
                <div className="hidden sm:block">Employment</div>
                <div className="sm:hidden">Work</div>
              </div>
              <div className={`${currentStep >= 3 ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
                <div className="hidden sm:block">Emergency Contact</div>
                <div className="sm:hidden">Contact</div>
              </div>
              <div className={`${currentStep >= 4 ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
                <div className="hidden sm:block">Review & Photo</div>
                <div className="sm:hidden">Complete</div>
              </div>
            </div>
          </div>

          {/* Form Content */}
          <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm">
            <CardContent className="p-6 md:p-8">
              {renderStep()}
            </CardContent>
          </Card>

          {/* Navigation Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 mt-8">
            <Button
              variant="outline"
              onClick={currentStep === 1 ? () => onNavigate(isCompletingProfile ? 'dashboard' : 'landing') : prevStep}
              className="flex items-center justify-center order-2 sm:order-1"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {currentStep === 1 ? (isCompletingProfile ? 'Back to Dashboard' : 'Back to Login') : 'Previous'}
            </Button>

            {currentStep < 4 ? (
              <Button 
                onClick={nextStep} 
                className="flex items-center justify-center bg-blue-600 hover:bg-blue-700 shadow-lg order-1 sm:order-2 flex-1 sm:flex-none"
              >
                Next Step
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button 
                onClick={handleSubmit} 
                className="flex items-center justify-center bg-green-600 hover:bg-green-700 shadow-lg order-1 sm:order-2 flex-1 sm:flex-none"
              >
                Complete Registration
                <CheckCircle className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white/80 backdrop-blur-sm border-t border-gray-200 p-4">
        <div className="text-center max-w-6xl mx-auto">
          <p className="text-xs text-gray-500">
            Complete your profile to access all ALUzon member benefits
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Associated Labor Union - Luzon Regional
          </p>
        </div>
      </div>
    </div>
  );
}